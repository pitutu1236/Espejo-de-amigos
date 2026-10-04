import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'node:url';
import {
  getStoredSmtpConfig,
  saveSmtpConfig,
  verifySmtpConfig,
  dispatchAnonymousEmail,
  createTransport,
  SmtpConfig
} from './server/mailService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const STORAGE_DIR = path.join(process.cwd(), 'storage');
const UPLOAD_DIR = path.join(STORAGE_DIR, 'uploads');
const DB_FILE = path.join(STORAGE_DIR, 'shares.json');
const SMTP_CONFIG_FILE = path.join(STORAGE_DIR, 'smtp.json');

// Ensure private directories exist (outside public and dist folders)
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true, mode: 0o700 });
}
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true, mode: 0o700 });
}

interface ShareRecord {
  token: string;              // 32 bytes cryptographically secure (256-bit entropy)
  internalFilename: string;   // Random UUID + extension (no user filename preserved)
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  fileSizeBytes: number;
  createdAt: number;          // Timestamp epoch ms
  expiresAt: number;          // Timestamp epoch ms
  maxDownloads: number | null;// 1, 5, or null (unlimited)
  downloadCount: number;      // Successful downloads
  isDeleted: boolean;
  recipientEmail?: string | null;
  emailSent?: boolean;
  emailSentAt?: number | null;
}

// In-memory index backed by file persistence
let sharesDb: Record<string, ShareRecord> = {};

function loadDb(): void {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      sharesDb = JSON.parse(data);
    }
  } catch (err) {
    console.error('[Storage] Error loading shares DB, initializing empty:', err);
    sharesDb = {};
  }
}

function saveDb(): void {
  try {
    const tempFile = `${DB_FILE}.${Date.now()}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(sharesDb, null, 2), { mode: 0o600 });
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[Storage] Error saving shares DB:', err);
  }
}

loadDb();

function getShareRecord(token: string): ShareRecord | undefined {
  if (sharesDb[token]) return sharesDb[token];
  loadDb();
  return sharesDb[token];
}

// Automatic cleanup of expired or exhausted files
function cleanupExpiredShares(): void {
  const now = Date.now();
  let modified = false;

  for (const [token, record] of Object.entries(sharesDb)) {
    const isExpired = now >= record.expiresAt;
    const isLimitReached = record.maxDownloads !== null && record.downloadCount >= record.maxDownloads;

    if (isExpired || isLimitReached || record.isDeleted) {
      // Safely delete file from disk
      const safeFilename = path.basename(record.internalFilename);
      const filePath = path.join(UPLOAD_DIR, safeFilename);

      // Verify path stays within UPLOAD_DIR (Anti-path traversal)
      if (filePath.startsWith(UPLOAD_DIR) && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.error(`[Storage] Failed to delete file ${safeFilename}:`, unlinkErr);
        }
      }

      delete sharesDb[token];
      modified = true;
    }
  }

  if (modified) {
    saveDb();
  }
}

// Run cleanup every 2 minutes
setInterval(cleanupExpiredShares, 2 * 60 * 1000);

// In-memory sliding rate limiter per IP
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const uploadRateLimits = new Map<string, RateLimitEntry>();
const downloadRateLimits = new Map<string, RateLimitEntry>();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

function checkRateLimit(map: Map<string, RateLimitEntry>, ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = map.get(ip);

  if (!entry || now > entry.resetAt) {
    map.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}

// Clean up stale rate limits periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of uploadRateLimits.entries()) {
    if (now > entry.resetAt) uploadRateLimits.delete(ip);
  }
  for (const [ip, entry] of downloadRateLimits.entries()) {
    if (now > entry.resetAt) downloadRateLimits.delete(ip);
  }
}, 5 * 60 * 1000);

// SMTP Configuration handling
export interface SmtpSettings {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromEmail?: string;
  secure?: boolean;
}

function getSmtpSettings(): SmtpSettings | null {
  // 1. Environment variables priority
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      fromEmail: process.env.FROM_EMAIL || `"El Espejo de Amigos" <${process.env.SMTP_USER}>`,
      secure: process.env.SMTP_PORT === '465',
    };
  }

  // 2. Storage file fallback (configured via UI or secret file)
  try {
    if (fs.existsSync(SMTP_CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(SMTP_CONFIG_FILE, 'utf-8'));
      if (
        data.host && 
        data.user && 
        data.pass && 
        !data.host.includes('ethereal') && 
        !data.user.includes('ethereal')
      ) {
        return {
          host: data.host,
          port: Number(data.port) || 587,
          user: data.user,
          pass: data.pass,
          fromEmail: data.fromEmail || `"El Espejo de Amigos" <${data.user}>`,
          secure: Number(data.port) === 465 || data.secure === true,
        };
      }
    }
  } catch (err) {
    console.error('[SMTP] Error reading smtp.json:', err);
  }

  // 3. Stored permanent production credentials for espejodeamigos.notifica@gmail.com
  return {
    host: 'smtp.gmail.com',
    port: 465,
    user: 'espejodeamigos.notifica@gmail.com',
    pass: 'bisehawnpdbxxycq',
    fromEmail: 'espejodeamigos.notifica@gmail.com',
    secure: true,
  };
}

function createMailTransporter(settings: SmtpSettings) {
  const cleanPass = settings.pass.replace(/\s+/g, '');
  if (settings.host.includes('gmail.com') || settings.user.includes('@gmail.com')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: settings.user,
        pass: cleanPass,
      },
    });
  }

  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure || settings.port === 465,
    auth: {
      user: settings.user,
      pass: cleanPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

// Helper to dispatch notification email with maximum inbox deliverability
interface SendEmailOptions {
  recipientEmail: string;
  recipientName?: string;
  shareUrl: string;
  durationLabel: string;
  downloadLimitLabel: string;
}

async function sendAnonymousNotificationEmail(options: SendEmailOptions): Promise<{ 
  success: boolean; 
  delivered: boolean; 
  needsConfig?: boolean; 
  error?: string;
  message?: string;
  previewUrl?: string;
}> {
  const result = await dispatchAnonymousEmail({
    recipientEmail: options.recipientEmail,
    recipientName: options.recipientName,
    shareUrl: options.shareUrl,
    durationLabel: options.durationLabel,
    downloadLimitLabel: options.downloadLimitLabel,
  });

  return {
    success: result.success,
    delivered: result.delivered,
    needsConfig: result.needsAuth,
    error: result.error,
    message: result.message,
  };
}

async function startServer() {
  const app = express();

  // Trust Cloud Run / Reverse Proxy for HTTPS detection
  app.set('trust proxy', 1);

  // Basic security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Limit body size to 12MB to strictly enforce <= 10MB file limit
  app.use(express.json({ limit: '12mb' }));

  // Helper to build canonical origin matching the current running server
  function getPublicOrigin(req: Request, clientOrigin?: string): string {
    if (clientOrigin && typeof clientOrigin === 'string' && clientOrigin.startsWith('http')) {
      return clientOrigin.replace(/\/$/, '');
    }
    if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
      return process.env.APP_URL.replace(/\/$/, '');
    }
    const proto = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
    const host = req.get('x-forwarded-host') || req.get('host') || `localhost:${PORT}`;
    return `${proto}://${host}`;
  }

  // 1. API: Create anonymous temporary share link
  app.post('/api/shares', async (req: Request, res: Response): Promise<void> => {
    const clientIp = getClientIp(req);
    // Rate limit: 12 uploads per minute per IP
    if (!checkRateLimit(uploadRateLimits, clientIp, 12, 60 * 1000)) {
      res.status(429).json({ error: 'Demasiadas solicitudes. Por favor, espera un momento.' });
      return;
    }

    try {
      const { 
        imageBase64, 
        duration = '7d', 
        downloadLimit = 'unlimited',
        recipientEmail,
        recipientName,
        clientOrigin,
      } = req.body;

      if (!imageBase64 || typeof imageBase64 !== 'string') {
        res.status(400).json({ error: 'La imagen es obligatoria y debe ser válida.' });
        return;
      }

      // Validate email format if provided
      let cleanRecipientEmail: string | null = null;
      if (recipientEmail && typeof recipientEmail === 'string' && recipientEmail.trim().length > 0) {
        const trimmed = recipientEmail.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed) || trimmed.length > 254) {
          res.status(400).json({ error: 'El formato del correo electrónico no es válido.' });
          return;
        }
        cleanRecipientEmail = trimmed;
      }

      // Calculate approximate binary size from base64
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const rawBuffer = Buffer.from(base64Data, 'base64');

      // Maximum file size: 10 MB (10 * 1024 * 1024 bytes)
      const MAX_BYTES = 10 * 1024 * 1024;
      if (rawBuffer.length > MAX_BYTES) {
        res.status(413).json({ error: 'El archivo excede el tamaño máximo permitido de 10 MB.' });
        return;
      }

      // Validate real binary magic bytes via sharp
      let imageMeta;
      try {
        imageMeta = await sharp(rawBuffer).metadata();
      } catch (sharpErr) {
        res.status(400).json({ error: 'El archivo no es una imagen válida o está dañado.' });
        return;
      }

      const validFormats = ['jpeg', 'png', 'webp'];
      if (!imageMeta.format || !validFormats.includes(imageMeta.format)) {
        res.status(400).json({ error: 'Formato no permitido. Solo se aceptan imágenes JPEG, PNG o WebP.' });
        return;
      }

      // Strip/clean EXIF metadata (GPS, camera info, author tags) while preserving orientation
      const sanitizedImageBuffer = await sharp(rawBuffer)
        .rotate() // automatically normalizes orientation
        .toBuffer();

      // Determine duration in milliseconds & label
      let durationMs: number;
      let durationLabel = '24 horas';
      switch (duration) {
        case '10m':
          durationMs = 10 * 60 * 1000;
          durationLabel = '10 minutos';
          break;
        case '1h':
          durationMs = 60 * 60 * 1000;
          durationLabel = '1 hora';
          break;
        case '24h':
          durationMs = 24 * 60 * 60 * 1000;
          durationLabel = '24 horas';
          break;
        case '7d':
          durationMs = 7 * 24 * 60 * 60 * 1000;
          durationLabel = '7 días';
          break;
        default:
          durationMs = 24 * 60 * 60 * 1000;
      }

      // Determine download limit
      let maxDownloads: number | null = null;
      let downloadLimitLabel = 'Ilimitadas durante el periodo';
      if (downloadLimit === 1 || downloadLimit === '1') {
        maxDownloads = 1;
        downloadLimitLabel = '1 única descarga';
      } else if (downloadLimit === 5 || downloadLimit === '5') {
        maxDownloads = 5;
        downloadLimitLabel = '5 descargas';
      }

      // Cryptographically secure token generation (32 bytes = 256 bits random)
      // Never consecutive IDs, never Math.random(), never includes user data
      const token = crypto.randomBytes(32).toString('base64url');

      // Internal safe filename (UUID v4 + real extension)
      const ext = imageMeta.format === 'jpeg' ? 'jpg' : imageMeta.format;
      const internalFilename = `${crypto.randomUUID()}.${ext}`;
      const safeFilePath = path.join(UPLOAD_DIR, internalFilename);

      // Save file strictly outside public folders
      fs.writeFileSync(safeFilePath, sanitizedImageBuffer, { mode: 0o600 });

      const now = Date.now();
      const mimeType = imageMeta.format === 'jpeg' ? 'image/jpeg' : `image/${imageMeta.format}` as any;

      const newRecord: ShareRecord = {
        token,
        internalFilename,
        mimeType,
        fileSizeBytes: sanitizedImageBuffer.length,
        createdAt: now,
        expiresAt: now + durationMs,
        maxDownloads,
        downloadCount: 0,
        isDeleted: false,
        recipientEmail: cleanRecipientEmail,
        emailSent: false,
        emailSentAt: null,
      };

      sharesDb[token] = newRecord;
      saveDb();

      // Build canonical public URL (accessible outside localhost)
      const origin = getPublicOrigin(req, clientOrigin);
      const shareUrl = `${origin}/s/${token}`;

      // Dispatch notification email if recipient email provided
      let emailDispatchResult = { success: false, delivered: false, message: '', error: '' };
      const currentSmtp = getSmtpSettings();

      if (cleanRecipientEmail) {
        const dispatch = await sendAnonymousNotificationEmail({
          recipientEmail: cleanRecipientEmail,
          recipientName: typeof recipientName === 'string' ? recipientName.trim() : undefined,
          shareUrl,
          durationLabel,
          downloadLimitLabel,
        });

        emailDispatchResult = {
          success: dispatch.success,
          delivered: dispatch.delivered,
          message: dispatch.message || '',
          error: dispatch.error || '',
        };

        if (dispatch.delivered) {
          newRecord.emailSent = true;
          newRecord.emailSentAt = Date.now();
          saveDb();
        }
      }

      res.status(201).json({
        success: true,
        token,
        shareUrl,
        expiresAt: newRecord.expiresAt,
        maxDownloads: newRecord.maxDownloads,
        recipientEmail: cleanRecipientEmail,
        emailSent: newRecord.emailSent,
        smtpConfigured: !!currentSmtp,
        emailStatus: cleanRecipientEmail
          ? (newRecord.emailSent 
              ? 'Enviado correctamente al correo del destinatario por el servidor' 
              : (currentSmtp ? 'Error al enviar por SMTP' : 'Email guardado en la app (pendiente de envío)'))
          : undefined,
        emailError: emailDispatchResult.error || undefined,
      });
    } catch (err) {
      console.error('[API] Error creating anonymous share:', err);
      res.status(500).json({ error: 'Error interno al procesar el enlace anónimo.' });
    }
  });

  // 2. API: Check SMTP configuration status
  app.get('/api/smtp-config', (_req: Request, res: Response) => {
    const settings = getSmtpSettings();
    if (!settings) {
      res.json({ configured: false });
      return;
    }
    res.json({
      configured: true,
      host: settings.host,
      port: settings.port,
      user: settings.user,
      fromEmail: settings.fromEmail,
      settings: {
        host: settings.host,
        port: settings.port,
        user: settings.user,
        fromEmail: settings.fromEmail,
      },
      service: settings.host.includes('gmail') || settings.user.includes('@gmail.com') ? 'Gmail' : 'Custom SMTP',
    });
  });

  // 3. API: Save & test SMTP configuration
  app.post('/api/smtp-config', async (req: Request, res: Response): Promise<void> => {
    try {
      let { host, port, user, pass, fromEmail } = req.body;
      if (!user || !pass) {
        res.status(400).json({ error: 'El correo emisor y la contraseña son obligatorios.' });
        return;
      }

      user = user.trim();
      pass = pass.trim();

      // Automate all technical parameters based on the email domain
      let resolvedHost = host?.trim();
      let resolvedPort = Number(port);

      if (!resolvedHost) {
        if (user.endsWith('@gmail.com') || user.includes('gmail')) {
          resolvedHost = 'smtp.gmail.com';
          resolvedPort = 465;
        } else if (user.endsWith('@outlook.com') || user.endsWith('@hotmail.com') || user.endsWith('@live.com')) {
          resolvedHost = 'smtp.office365.com';
          resolvedPort = 587;
        } else if (user.endsWith('@yahoo.com')) {
          resolvedHost = 'smtp.mail.yahoo.com';
          resolvedPort = 465;
        } else {
          resolvedHost = 'smtp.gmail.com';
          resolvedPort = 465;
        }
      } else {
        if (!resolvedPort) resolvedPort = resolvedHost.includes('gmail') ? 465 : 587;
      }

      const testSettings: SmtpSettings = {
        host: resolvedHost,
        port: resolvedPort,
        user,
        pass,
        fromEmail: fromEmail?.trim() || `"El Espejo de Amigos" <${user}>`,
        secure: resolvedPort === 465,
      };

      // Test connection
      const transporter = createMailTransporter(testSettings);
      await transporter.verify();

      // Save securely to storage/smtp.json (outside public folder)
      fs.writeFileSync(SMTP_CONFIG_FILE, JSON.stringify(testSettings, null, 2), { mode: 0o600 });

      res.json({
        success: true,
        message: '¡Emisor de correo activado y verificado con éxito!',
        configured: true,
      });
    } catch (err: any) {
      console.error('[SMTP] Verification error:', err);
      let friendlyError = err.message || 'Error de conexión';
      if (friendlyError.includes('Invalid login') || friendlyError.includes('BadCredentials')) {
        friendlyError = 'Contraseña incorrecta. En Gmail, asegúrate de usar la Contraseña de Aplicación de 16 letras generada en tu cuenta de Google.';
      }
      res.status(400).json({
        error: friendlyError,
      });
    }
  });

  // 4. API: Send test email
  app.post('/api/send-test-email', async (req: Request, res: Response): Promise<void> => {
    try {
      const { testEmail } = req.body;
      if (!testEmail || typeof testEmail !== 'string') {
        res.status(400).json({ error: 'Debes indicar un correo de prueba.' });
        return;
      }

      const settings = getSmtpSettings();
      if (!settings) {
        res.status(400).json({ error: 'Debes configurar las credenciales SMTP antes de enviar una prueba.' });
        return;
      }

      const transporter = createMailTransporter(settings);
      const info = await transporter.sendMail({
        from: settings.fromEmail,
        to: testEmail.trim(),
        subject: '✓ Prueba de correo - El Espejo de Amigos',
        text: '¡Hola! Este es un correo de prueba para verificar que el servidor de El Espejo de Amigos puede enviar correos a tu buzón correctamente.',
        html: `
        <div style="font-family: sans-serif; padding: 20px; background: #fff; border-radius: 12px; border: 1px solid #eee;">
          <h2 style="color: #d97706;">✓ Prueba de Envío Exitosa</h2>
          <p>Tu servidor de correo para <strong>El Espejo de Amigos</strong> está funcionando correctamente.</p>
          <p>A partir de ahora, cada vez que crees un enlace temporal indicando un email, el destinatario recibirá el aviso en su buzón de forma automática.</p>
        </div>
        `,
      });

      res.json({ success: true, message: `Correo de prueba enviado a ${testEmail.trim()}`, messageId: info.messageId });
    } catch (err: any) {
      console.error('[SMTP] Test email failed:', err);
      res.status(500).json({ error: `Fallo al enviar correo de prueba: ${err.message}` });
    }
  });

  // 4b. API: Send anonymous email directly via server service
  app.post('/api/send-anonymous-email', async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await dispatchAnonymousEmail(req.body);
      if (!result.success) {
        res.status(result.needsAuth ? 400 : 500).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      console.error('[Email] Failed to send anonymous email:', err);
      res.status(500).json({
        success: false,
        delivered: false,
        error: err.message || 'Error al enviar el correo.',
      });
    }
  });

  // 5. API: Get share metadata (Receiver view check)
  // Anti-enumeration: returns generic 404 for non-existent, expired, or depleted tokens
  app.get('/api/shares/:token', (req: Request, res: Response): void => {
    const clientIp = getClientIp(req);
    // Rate limit: 60 requests per minute
    if (!checkRateLimit(downloadRateLimits, clientIp, 60, 60 * 1000)) {
      res.status(429).json({ error: 'Demasiadas solicitudes. Por favor, espera.' });
      return;
    }

    const { token } = req.params;
    if (!token || typeof token !== 'string' || token.length < 30) {
      res.status(404).json({ error: 'Enlace no disponible o caducado.' });
      return;
    }

    const record = getShareRecord(token);
    const now = Date.now();

    if (!record || record.isDeleted || now >= record.expiresAt || (record.maxDownloads !== null && record.downloadCount >= record.maxDownloads)) {
      res.status(404).json({ error: 'Enlace no disponible o caducado.' });
      return;
    }

    const remainingSeconds = Math.max(0, Math.floor((record.expiresAt - now) / 1000));
    const remainingDownloads = record.maxDownloads !== null 
      ? Math.max(0, record.maxDownloads - record.downloadCount) 
      : null;

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json({
      token: record.token,
      expiresAt: record.expiresAt,
      remainingSeconds,
      maxDownloads: record.maxDownloads,
      downloadCount: record.downloadCount,
      remainingDownloads,
      isExpired: false,
      isLimitReached: false,
      fileSizeBytes: record.fileSizeBytes,
      mimeType: record.mimeType,
    });
  });

  // 6. API: View/Preview image (inline)
  app.get('/api/shares/:token/view', (req: Request, res: Response): void => {
    const clientIp = getClientIp(req);
    if (!checkRateLimit(downloadRateLimits, clientIp, 60, 60 * 1000)) {
      res.status(429).send('Demasiadas solicitudes.');
      return;
    }

    const { token } = req.params;
    const record = getShareRecord(token);
    const now = Date.now();

    if (!record || record.isDeleted || now >= record.expiresAt || (record.maxDownloads !== null && record.downloadCount >= record.maxDownloads)) {
      res.status(404).send('Imagen no disponible o caducada.');
      return;
    }

    // Path traversal defense: resolve strictly within UPLOAD_DIR
    const safeFilename = path.basename(record.internalFilename);
    const filePath = path.join(UPLOAD_DIR, safeFilename);

    if (!filePath.startsWith(UPLOAD_DIR) || !fs.existsSync(filePath)) {
      res.status(404).send('Archivo no encontrado.');
      return;
    }

    res.setHeader('Content-Type', record.mimeType);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');

    fs.createReadStream(filePath).pipe(res);
  });

  // 7. API: Download image (increments download counter & cleans if exhausted)
  app.get('/api/shares/:token/download', (req: Request, res: Response): void => {
    const clientIp = getClientIp(req);
    if (!checkRateLimit(downloadRateLimits, clientIp, 40, 60 * 1000)) {
      res.status(429).send('Demasiadas solicitudes.');
      return;
    }

    const { token } = req.params;
    const record = getShareRecord(token);
    const now = Date.now();

    if (!record || record.isDeleted || now >= record.expiresAt || (record.maxDownloads !== null && record.downloadCount >= record.maxDownloads)) {
      res.status(404).send('Enlace no disponible o límite de descargas superado.');
      return;
    }

    const safeFilename = path.basename(record.internalFilename);
    const filePath = path.join(UPLOAD_DIR, safeFilename);

    if (!filePath.startsWith(UPLOAD_DIR) || !fs.existsSync(filePath)) {
      res.status(404).send('Archivo no disponible.');
      return;
    }

    // Increment download counter
    record.downloadCount += 1;
    saveDb();

    res.setHeader('Content-Type', record.mimeType);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Generic download name with zero personal info
    res.setHeader('Content-Disposition', 'attachment; filename="espejo-personalidad-anonimo.png"');

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);

    // If limit reached after this download, trigger immediate cleanup
    if (record.maxDownloads !== null && record.downloadCount >= record.maxDownloads) {
      stream.on('end', () => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          record.isDeleted = true;
          delete sharesDb[token];
          saveDb();
        } catch (cleanupErr) {
          console.error('[Storage] Post-download cleanup error:', cleanupErr);
        }
      });
    }
  });

  // 8. Public Direct Receiver Page: /s/:token
  // Renders a high-fidelity standalone page with the image, countdown and download button.
  // 100% reliable across in-app browsers, mobile email clients, and external devices.
  app.get(['/s/:token', '/s/:token/'], (req: Request, res: Response): void => {
    const rawToken = req.params.token || (req.query.token as string) || '';
    const token = rawToken.replace(/\.png$/, '').replace(/\/$/, '').trim();
    const record = getShareRecord(token);
    const now = Date.now();

    if (!record || record.isDeleted || now >= record.expiresAt || (record.maxDownloads !== null && record.downloadCount >= record.maxDownloads)) {
      res.status(404).send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Enlace no disponible - El Espejo de Amigos</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FAF8F5; margin: 0; padding: 24px; color: #1c1917; display: flex; align-items: center; justify-content: center; min-height: 90vh; }
            .card { max-width: 480px; width: 100%; background: #ffffff; border-radius: 24px; padding: 32px; border: 1px solid #e7e5e4; box-shadow: 0 10px 25px rgba(0,0,0,0.06); text-align: center; }
            .badge { display: inline-block; background: #fee2e2; color: #991b1b; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 800; text-transform: uppercase; margin-bottom: 16px; }
            h1 { font-size: 22px; font-weight: 800; margin: 0 0 12px 0; color: #1c1917; }
            p { font-size: 14px; color: #57534e; line-height: 1.6; margin: 0 0 24px 0; }
            .btn { display: inline-block; background: #d97706; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 14px; padding: 12px 24px; border-radius: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">⏳ Enlace no disponible</div>
            <h1>La lámina ha caducado o no existe</h1>
            <p>Este enlace temporal era válido por 7 días o ha alcanzado su límite de descargas por privacidad y seguridad.</p>
            <a href="/" class="btn">Ir al inicio</a>
          </div>
        </body>
        </html>
      `);
      return;
    }

    const remainingSecs = Math.max(0, Math.floor((record.expiresAt - now) / 1000));
    const days = Math.floor(remainingSecs / 86400);
    const hours = Math.floor((remainingSecs % 86400) / 3600);
    const timeLabel = days > 0 ? `${days} días y ${hours} horas` : `${hours} horas`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Valoración de Personalidad - El Espejo de Amigos</title>
        <meta name="description" content="Un amigo anónimo ha compartido su valoración de tu personalidad contigo.">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            background-color: #FAF8F5;
            color: #1c1917;
            margin: 0;
            padding: 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
          }
          .container {
            max-width: 640px;
            width: 100%;
            background: #ffffff;
            border-radius: 28px;
            border: 1px solid #e7e5e4;
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            padding: 24px;
            margin: 16px 0 32px 0;
          }
          @media (min-width: 640px) {
            .container { padding: 32px; }
          }
          .header-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #1c1917;
            color: #fde047;
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            margin-bottom: 14px;
          }
          h1 {
            font-size: 22px;
            font-weight: 800;
            line-height: 1.25;
            margin: 0 0 10px 0;
            color: #1c1917;
          }
          p.desc {
            font-size: 14px;
            color: #57534e;
            line-height: 1.6;
            margin: 0 0 18px 0;
          }
          .timer-box {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #fef3c7;
            border: 1px solid #fde68a;
            border-radius: 16px;
            padding: 12px 16px;
            margin-bottom: 20px;
            font-size: 12px;
            font-weight: 700;
            color: #92400e;
          }
          .image-wrapper {
            background: #f5f5f4;
            border-radius: 20px;
            border: 1px solid #e7e5e4;
            padding: 8px;
            margin-bottom: 20px;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.03);
            text-align: center;
          }
          .image-wrapper img {
            width: 100%;
            height: auto;
            max-height: 75vh;
            object-fit: contain;
            border-radius: 14px;
            display: block;
            margin: 0 auto;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          }
          .actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .btn-primary {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: #d97706;
            color: #ffffff;
            text-decoration: none;
            font-weight: 800;
            font-size: 14px;
            padding: 14px 20px;
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(217, 119, 6, 0.3);
            transition: background 0.15s;
          }
          .btn-primary:hover { background: #b45309; }
          .btn-secondary {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: #f5f5f4;
            color: #44403c;
            text-decoration: none;
            font-weight: 700;
            font-size: 13px;
            padding: 12px 20px;
            border-radius: 16px;
            transition: background 0.15s;
          }
          .btn-secondary:hover { background: #e7e5e4; }
          .footer-note {
            text-align: center;
            font-size: 11px;
            color: #78716c;
            margin-top: 24px;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div style="text-align: center;">
            <div class="header-badge">🤫 El Espejo de Amigos</div>
            <h1>Tu Lámina de Personalidad</h1>
            <p class="desc">
              Un amigo o amiga anónimo ha completado la dinámica valorando 50 aspectos sobre tu forma de ser. Aquí tienes tu lámina exclusiva:
            </p>
          </div>

          <div class="timer-box">
            <span>⏳ Enlace temporal activo</span>
            <span>Disponible durante ${timeLabel}</span>
          </div>

          <div class="image-wrapper">
            <a href="/api/shares/${token}/view" target="_blank" title="Haz clic para ver a tamaño completo">
              <img src="/api/shares/${token}/view" alt="Lámina de personalidad valorada" loading="eager" />
            </a>
          </div>

          <div class="actions">
            <a href="/api/shares/${token}/download" class="btn-primary" download="espejo-personalidad-anonimo.png">
              ⬇ Descargar lámina en alta resolución
            </a>
            <a href="/" class="btn-secondary">
              ✨ Hacer tú una valoración anónima a un amigo
            </a>
          </div>

          <div class="footer-note">
            Este enlace es estrictamente privado y temporal. Por privacidad, caduca automáticamente en 7 días.
          </div>
        </div>
      </body>
      </html>
    `);
  });

  // Vite Integration: Middleware in dev, Static files in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('sw.js') || filePath.endsWith('manifest.webmanifest')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      },
    }));
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] App running securely on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal server startup error:', err);
  process.exit(1);
});
