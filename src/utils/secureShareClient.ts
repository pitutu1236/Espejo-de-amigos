import { ShareDuration, ShareDownloadLimit, CreateShareResponse, ShareMetadata } from '../types';

export interface CreateShareParams {
  imageBase64: string;
  duration: ShareDuration;
  downloadLimit: ShareDownloadLimit;
  recipientEmail?: string;
  recipientName?: string;
}

/**
 * Creates an anonymous, temporary, and cryptographically secure share link.
 * Strips user identity, cleans EXIF, assigns an unguessable 256-bit token,
 * stores recipient email and dispatches notification message,
 * and sets strict expiration / download limits.
 */
export async function createAnonymousShareLink(
  params: CreateShareParams
): Promise<CreateShareResponse> {
  const clientOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const response = await fetch('/api/shares', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64: params.imageBase64,
      duration: params.duration,
      downloadLimit: params.downloadLimit,
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName,
      clientOrigin,
    }),
  });

  if (!response.ok) {
    let errorMsg = 'Error al generar el enlace anónimo';
    try {
      const errData = await response.json();
      if (errData.error) errorMsg = errData.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const data: CreateShareResponse = await response.json();
  return data;
}

/**
 * Retrieves public metadata for the receiver (countdown, remaining downloads).
 * Zero personal sender identity is ever revealed.
 */
export async function fetchShareMetadata(token: string): Promise<ShareMetadata | null> {
  try {
    const response = await fetch(`/api/shares/${encodeURIComponent(token)}`, {
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (err) {
    console.error('Error fetching share metadata:', err);
    return null;
  }
}

/**
 * Returns URL for inline viewing
 */
export function getAnonymousViewUrl(token: string): string {
  return `/api/shares/${encodeURIComponent(token)}/view`;
}

/**
 * Returns URL for direct download
 */
export function getAnonymousDownloadUrl(token: string): string {
  return `/api/shares/${encodeURIComponent(token)}/download`;
}

/**
 * Checks if the backend has SMTP configured
 */
export async function fetchSmtpConfigStatus(): Promise<{ configured: boolean; host?: string; user?: string; fromEmail?: string; service?: string }> {
  try {
    const res = await fetch('/api/smtp-config');
    if (!res.ok) return { configured: false };
    return res.json();
  } catch {
    return { configured: false };
  }
}

/**
 * Retrieves the current SMTP server status
 */
export async function getSmtpConfig(): Promise<{
  configured: boolean;
  user?: string;
  host?: string;
  port?: number;
  fromEmail?: string;
  service?: string;
  settings?: {
    host: string;
    port: number;
    secure?: boolean;
    user: string;
    fromEmail?: string;
    fromName?: string;
  };
}> {
  try {
    const res = await fetch('/api/smtp-config');
    const data = await res.json();
    return data;
  } catch (err) {
    return { configured: false };
  }
}

/**
 * Saves and tests SMTP configuration
 */
export async function saveSmtpConfig(config: {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  pass: string;
  fromName?: string;
  fromEmail?: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/smtp-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Error al conectar al servidor SMTP' };
    }
    return { success: true, message: data.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de red al configurar SMTP' };
  }
}

/**
 * Sends a test email to verify credentials
 */
export async function sendTestEmail(testEmail: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/send-test-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testEmail }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Error al enviar correo de prueba' };
    }
    return { success: true, message: data.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de red' };
  }
}

/**
 * Sends anonymous email directly through server dispatch service
 */
export async function sendAnonymousEmailDirect(params: {
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  message: string;
  shareUrl: string;
}): Promise<{ 
  success: boolean; 
  delivered: boolean; 
  error?: string; 
  message?: string; 
  needsConfig?: boolean 
}> {
  try {
    const res = await fetch('/api/send-anonymous-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      delivered: false,
      error: err.message || 'Error de conexión con el servidor de correo.',
    };
  }
}

