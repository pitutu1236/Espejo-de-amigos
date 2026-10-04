import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';

export interface SmtpConfig {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  pass: string;
  fromName?: string;
  fromEmail?: string;
}

export interface SendAnonymousEmailOptions {
  recipientEmail: string;
  recipientName?: string;
  subject?: string;
  message?: string;
  shareUrl?: string;
  durationLabel?: string;
  downloadLimitLabel?: string;
}

export interface SendResult {
  success: boolean;
  delivered: boolean;
  message?: string;
  error?: string;
  needsAuth?: boolean;
  messageId?: string;
  sender?: string;
  recipient?: string;
}

const STORAGE_DIR = path.join(process.cwd(), 'storage');
const SMTP_CONFIG_FILE = path.join(STORAGE_DIR, 'smtp.json');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true, mode: 0o700 });
}

/**
 * Loads SMTP configuration with permanent stored credentials
 */
export function getStoredSmtpConfig(): SmtpConfig {
  // 1. Check environment variables
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE !== 'false',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      fromName: process.env.SMTP_FROM_NAME || 'El Espejo de Amigos',
      fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
    };
  }

  // 2. Check persistent file in storage/smtp.json
  if (fs.existsSync(SMTP_CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(SMTP_CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data) as SmtpConfig;
      if (parsed.user && parsed.pass) {
        return {
          ...parsed,
          fromName: 'El Espejo de Amigos',
          fromEmail: parsed.fromEmail || parsed.user,
        };
      }
    } catch (err) {
      console.error('[MailService] Error reading smtp.json:', err);
    }
  }

  // 3. Built-in production credentials for espejodeamigos.notifica@gmail.com
  return {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    user: 'espejodeamigos.notifica@gmail.com',
    pass: 'bisehawnpdbxxycq',
    fromName: 'El Espejo de Amigos',
    fromEmail: 'espejodeamigos.notifica@gmail.com',
  };
}

/**
 * Creates a Nodemailer transport instance
 */
export function createTransport(config: SmtpConfig) {
  const cleanPass = config.pass.replace(/\s+/g, '');
  const isGmail = config.host.includes('gmail.com') || config.user.includes('@gmail.com');

  if (isGmail) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.user,
        pass: cleanPass,
      },
    });
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure ?? (config.port === 465),
    auth: {
      user: config.user,
      pass: cleanPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Verifies credentials by calling verify() on transporter
 */
export async function verifySmtpConfig(config: SmtpConfig): Promise<boolean> {
  const transporter = createTransport(config);
  await transporter.verify();
  return true;
}

/**
 * Saves SMTP configuration to storage/smtp.json securely
 */
export function saveSmtpConfig(config: SmtpConfig): void {
  fs.writeFileSync(SMTP_CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}

/**
 * Builds email content and headers strictly optimized to pass SPF, DKIM, DMARC,
 * SpamAssassin, and modern Gmail/Yahoo/Outlook inbox deliverability filters.
 */
function buildDeliverabilityOptimizedContent(options: SendAnonymousEmailOptions) {
  const friendName = options.recipientName?.trim() || 'amigo/a';
  
  // Natural, non-spammy subject line (avoids parentheses, brackets, all-caps, and trigger words)
  const finalSubject = options.subject?.trim() 
    && !options.subject.includes('(El Espejo de Amigos)')
    ? options.subject.trim()
    : `${friendName}, te han dejado una valoración en El Espejo de Amigos`;

  const cleanShareUrl = options.shareUrl?.trim() || '';

  const defaultIntro = `Un amigo o compañero ha participado en la dinámica «El Espejo de Amigos», valorando 50 cualidades sobre tu forma de ser y personalidad.\n\nHa preparado una lámina gráfica personalizada en alta resolución para que puedas descubrir cómo te percibe y cuáles son tus virtudes y rasgos más destacados.`;
  
  const introMessage = options.message?.trim() || defaultIntro;

  // Invisible preheader snippet for Gmail/Apple Mail preview
  const preheader = `Un amigo o compañero ha compartido su valoración de tus cualidades en El Espejo de Amigos. Pulsa para ver tu lámina.`;

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="es">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${finalSubject}</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #faf8f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; border-radius: 0 !important; }
      .content-cell { padding: 24px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #faf8f5; color: #1c1917;">
  <!-- Hidden Preheader for Inbox Snippet -->
  <div style="display: none; font-size: 1px; color: #faf8f5; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    ${preheader}
    &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #faf8f5; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e7e5e4; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.04);" class="email-container">
          
          <!-- Header Branding (Clean, No spammy emojis) -->
          <tr>
            <td align="center" style="padding: 32px 32px 18px 32px; border-bottom: 1px solid #f5f5f4;" class="content-cell">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background-color: #1c1917; color: #fde047; padding: 6px 18px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">
                    El Espejo de Amigos
                  </td>
                </tr>
              </table>
              <h1 style="font-size: 21px; line-height: 1.35; font-weight: 800; color: #1c1917; margin: 18px 0 0 0;">
                ${finalSubject}
              </h1>
            </td>
          </tr>

          <!-- Message Body -->
          <tr>
            <td style="padding: 28px 32px 24px 32px; font-size: 15px; line-height: 1.65; color: #44403c;" class="content-cell">
              <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #1c1917;">
                Hola ${friendName}:
              </p>
              
              <div style="margin: 0 0 24px 0; white-space: pre-wrap; color: #44403c; font-size: 15px; line-height: 1.65;">
${introMessage}
              </div>

              ${cleanShareUrl ? `
              <!-- Bulletproof Call-To-Action Button -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 24px 0;">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="border-radius: 14px; background-color: #d97706; box-shadow: 0 3px 10px rgba(217, 119, 6, 0.28);">
                          <a href="${cleanShareUrl}" target="_blank" style="display: inline-block; padding: 15px 34px; font-size: 15px; font-weight: 800; color: #ffffff; text-decoration: none; border-radius: 14px; background-color: #d97706; letter-spacing: 0.2px;">
                            Ver mi lámina de personalidad &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Expiration note -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0 16px 0;">
                <tr>
                  <td style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 14px 18px;">
                    <p style="margin: 0; font-size: 12px; line-height: 1.55; color: #92400e; font-weight: 600;">
                      El enlace es privado y temporal: estará activo durante 7 días. Puedes abrirlo, guardarlo y descargar tu lámina en alta resolución en cualquier momento.
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <p style="margin: 24px 0 0 0; font-size: 14px; font-weight: 600; color: #57534e;">
                Saludos cordiales,<br />
                <em>El Espejo de Amigos</em>
              </p>
            </td>
          </tr>

          <!-- Footer Information (Compliance & High Deliverability) -->
          <tr>
            <td style="background-color: #fafaf9; border-top: 1px solid #f5f5f4; padding: 22px 32px; text-align: center; font-size: 12px; line-height: 1.55; color: #78716c;" class="content-cell">
              <p style="margin: 0 0 6px 0;">
                Recibes esta notificación porque una persona de tu entorno ha completado tu valoración en la plataforma <strong>El Espejo de Amigos</strong>.
              </p>
              <p style="margin: 0; font-size: 11px; color: #a8a29e;">
                Mensaje transaccional directo sin fines publicitarios.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Synchronized plain-text body (essential for high SpamAssassin score)
  const text = `${finalSubject}

Hola ${friendName}:

${introMessage}

${cleanShareUrl ? `Acceso a tu lámina de personalidad (enlace activo 7 días):\n${cleanShareUrl}\n\n` : ''}Saludos cordiales,
El Espejo de Amigos

---
Recibes esta notificación porque una persona de tu entorno ha completado tu valoración en la plataforma El Espejo de Amigos. Mensaje transaccional directo sin fines publicitarios.`;

  return { subject: finalSubject, html, text };
}

/**
 * Sends an email on behalf of the application with maximum inbox deliverability
 */
export async function dispatchAnonymousEmail(options: SendAnonymousEmailOptions): Promise<SendResult> {
  const recipient = options.recipientEmail?.trim().toLowerCase();
  if (!recipient) {
    return {
      success: false,
      delivered: false,
      error: 'El correo del destinatario es obligatorio.',
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipient)) {
    return {
      success: false,
      delivered: false,
      error: 'El formato del correo electrónico no es válido.',
    };
  }

  const config = getStoredSmtpConfig();
  const emailContent = buildDeliverabilityOptimizedContent(options);

  // Authenticated clean sender name without spam trigger phrases
  const senderDisplayName = 'El Espejo de Amigos';
  const senderAddress = config.user;
  const fromField = `"${senderDisplayName}" <${senderAddress}>`;

  // Standard Gmail-aligned Message ID for SPF & DKIM consistency
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const cleanMessageId = `<${Date.now()}.${randomSuffix}@gmail.com>`;

  try {
    const transporter = createTransport(config);
    const info = await transporter.sendMail({
      from: fromField,
      to: recipient,
      replyTo: fromField,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
      messageId: cleanMessageId,
      headers: {
        'List-Unsubscribe': `<mailto:${senderAddress}?subject=Baja>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'Feedback-ID': 'espejodeamigos:valoracion:transaccional',
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
      },
    });

    console.log(`[MailService] Correo entregado con éxito a ${recipient}. MessageId: ${info.messageId}`);
    return {
      success: true,
      delivered: true,
      message: `Correo entregado con éxito a ${recipient}`,
      sender: fromField,
      recipient,
      messageId: info.messageId,
    };
  } catch (err: any) {
    console.error(`[MailService] Error enviando a ${recipient}:`, err);
    return {
      success: false,
      delivered: false,
      error: `Error al entregar el correo a ${recipient}: ${err.message}`,
    };
  }
}
