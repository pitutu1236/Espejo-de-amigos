export interface SendEmailPayload {
  accessToken: string;
  recipientEmail: string;
  recipientName?: string;
  shareUrl: string;
}

export async function sendEmailViaGmailApi(payload: SendEmailPayload): Promise<{ success: boolean; id?: string }> {
  const friendName = payload.recipientName?.trim() || 'amigo/a';
  const subject = `Hola ${friendName}, tu amigo/a te ha enviado una imagen.`;
  const body = `Un amigo/a te ha enviado una imagen donde podrás ver la valoración de tu personalidad a través de sus ojos.\n\n${payload.shareUrl}\n\nUn abrazo de tu amigo/a anónimo.`;

  // Encode subject in UTF-8 base64 for RFC 2047 compliance
  const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;

  const emailLines = [
    `To: ${payload.recipientEmail}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    body,
  ];

  const rawMessage = emailLines.join('\r\n');
  const base64UrlMessage = btoa(unescape(encodeURIComponent(rawMessage)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${payload.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: base64UrlMessage,
    }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || `Error al enviar correo vía Gmail (${response.status})`);
  }

  const data = await response.json();
  return { success: true, id: data.id };
}
