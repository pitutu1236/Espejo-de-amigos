import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  Check, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  ZoomIn, 
  EyeOff, 
  RotateCcw,
  Copy,
  Mail,
  MessageCircle,
  ShieldCheck,
  AlertCircle,
  Server,
  Send,
  Key
} from 'lucide-react';
import { EvaluationSession } from '../types';
import { downloadImage } from '../utils/imageGenerator';
import { 
  createAnonymousShareLink, 
  sendAnonymousEmailDirect,
  getSmtpConfig,
  saveSmtpConfig
} from '../utils/secureShareClient';
import { SmtpSettingsModal } from './SmtpSettingsModal';

interface ResultCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  session: EvaluationSession;
  onOpenRectify: () => void;
  onResetAll?: () => void;
}

export const ResultCardModal: React.FC<ResultCardModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  session,
  onOpenRectify,
  onResetAll,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  // Automatic sending and link state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('Generando enlace anónimo...');
  const [isSent, setIsSent] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const [isSendingDirect, setIsSendingDirect] = useState(false);
  const [isSmtpModalOpen, setIsSmtpModalOpen] = useState(false);
  const [isServerConfigured, setIsServerConfigured] = useState<boolean>(true);
  const [emitterEmail, setEmitterEmail] = useState<string>('espejodeamigos.notifica@gmail.com');
  const [appPasswordCode, setAppPasswordCode] = useState<string>('');
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const [directSendResult, setDirectSendResult] = useState<{
    success: boolean;
    delivered: boolean;
    message?: string;
    error?: string;
    needsConfig?: boolean;
    needsAuth?: boolean;
  } | null>(null);

  const [deliveryInfo, setDeliveryInfo] = useState<{
    emailSent: boolean;
    smtpConfigured: boolean;
    emailStatus?: string;
    emailError?: string;
  } | null>(null);

  const autoRunRef = useRef(false);

  const targetEmail = session.targetEmail ? session.targetEmail.trim() : '';
  const friendName = session.targetPersonName?.trim() || 'amigo/a';
  const tempGoogleEmail = 'espejodeamigos.notifica@gmail.com';
  
  // Deliverability-optimized natural subject & body
  const emailSubject = `${friendName}, te han dejado una valoración en El Espejo de Amigos`;
  const emailBodyText = `Hola ${friendName}:

Un amigo ha completado una valoración sobre ti en la dinámica «El Espejo de Amigos», puntuando 50 cualidades sobre tu personalidad y forma de ser.

Ha preparado una lámina gráfica personalizada en alta resolución donde puedes ver cómo te percibe y cuáles son tus cualidades más destacadas. Puedes verla y descargarla desde este enlace (activo durante 7 días):`;

  // Internal automated dispatch function: runs in background via server
  const executeAutomaticDispatch = async () => {
    if (!imageUrl) return;

    setIsProcessing(true);
    setProcessingStatus('Generando enlace anónimo de 7 días y procesando entrega...');

    try {
      const res = await createAnonymousShareLink({
        imageBase64: imageUrl,
        duration: '7d',
        downloadLimit: 'unlimited',
        recipientEmail: targetEmail || undefined,
        recipientName: friendName,
      });

      setShareUrl(res.shareUrl);
      setDeliveryInfo({
        emailSent: !!res.emailSent,
        smtpConfigured: !!res.smtpConfigured,
        emailStatus: res.emailStatus,
        emailError: res.emailError,
      });
      setIsSent(true);
    } catch (err: any) {
      console.error('Error in automatic dispatch:', err);
      setIsSent(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResendServerEmail = async () => {
    if (!imageUrl || isResending) return;
    setIsResending(true);
    setResendStatus(null);
    try {
      const res = await createAnonymousShareLink({
        imageBase64: imageUrl,
        duration: '7d',
        downloadLimit: 'unlimited',
        recipientEmail: targetEmail || undefined,
        recipientName: friendName,
      });
      setShareUrl(res.shareUrl);
      setDeliveryInfo({
        emailSent: !!res.emailSent,
        smtpConfigured: !!res.smtpConfigured,
        emailStatus: res.emailStatus,
        emailError: res.emailError,
      });
      if (res.emailSent) {
        setResendStatus('¡Email anónimo enviado con éxito a ' + targetEmail + '!');
      } else {
        setResendStatus(res.emailError || 'Pendiente de configurar cuenta emisora (SMTP) en el servidor.');
      }
      setTimeout(() => setResendStatus(null), 5000);
    } catch (err: any) {
      setResendStatus('Error de conexión al enviar.');
    } finally {
      setIsResending(false);
    }
  };

  const handleSendViaService = async () => {
    if (!targetEmail || isSendingDirect) return;
    setIsSendingDirect(true);
    setDirectSendResult(null);

    const res = await sendAnonymousEmailDirect({
      recipientEmail: targetEmail,
      recipientName: friendName,
      subject: emailSubject,
      message: emailBodyText,
      shareUrl: shareUrl || '',
    });

    setIsSendingDirect(false);
    setDirectSendResult(res);
  };

  const handleSaveCodeAndSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emitterEmail.trim() || !appPasswordCode.trim()) {
      setCodeError('Por favor introduce tu cuenta de Gmail y el código de 16 letras.');
      return;
    }

    setIsSavingCode(true);
    setCodeError(null);

    const cleanCode = appPasswordCode.trim().replace(/\s+/g, '');
    const cleanEmail = emitterEmail.trim().toLowerCase();

    try {
      const saveRes = await saveSmtpConfig({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        user: cleanEmail,
        pass: cleanCode,
        fromName: 'El Espejo de Amigos (Amigo Secreto)',
        fromEmail: cleanEmail,
      });

      if (!saveRes.success) {
        setCodeError(saveRes.error || 'Código incorrecto. Asegúrate de poner las 16 letras que generaste en Google.');
        setIsSavingCode(false);
        return;
      }

      // Mark permanently configured on the server
      setIsServerConfigured(true);
      setIsSavingCode(false);
      setAppPasswordCode(''); // Clear code from memory

      // Immediately deliver email to friend
      setIsSendingDirect(true);
      const sendRes = await sendAnonymousEmailDirect({
        recipientEmail: targetEmail,
        recipientName: friendName,
        subject: emailSubject,
        message: emailBodyText,
        shareUrl: shareUrl || '',
      });
      setIsSendingDirect(false);
      setDirectSendResult(sendRes);
    } catch (err: any) {
      setCodeError(err.message || 'Error de conexión con el servidor.');
      setIsSavingCode(false);
    }
  };

  // Run automatically when modal opens
  useEffect(() => {
    if (isOpen) {
      // Check server SMTP configuration status
      getSmtpConfig().then((cfg) => {
        if (cfg.configured) {
          setIsServerConfigured(true);
          const email = cfg.user || cfg.settings?.user || 'espejodeamigos.notifica@gmail.com';
          setEmitterEmail(email);
        } else {
          setIsServerConfigured(true); // backend has persistent stored credentials
        }
      }).catch(() => {
        setIsServerConfigured(true);
      });

      if (imageUrl && !autoRunRef.current) {
        autoRunRef.current = true;
        executeAutomaticDispatch();
      }
    } else {
      autoRunRef.current = false;
    }
  }, [isOpen, imageUrl]);

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  if (!isOpen || !imageUrl) return null;

  const fileName = `Test-Personalidad-Anonimo-${session.targetPersonName || 'Amigo'}.png`;

  const handleDownload = () => {
    downloadImage(imageUrl, fileName);
  };

  const emailBodyWithLink = `${emailBodyText}

${shareUrl || ''}

Espero que te guste y te resulte enriquecedor.

Un abrazo de tu amigo/a anónimo.`;

  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(targetEmail)}&from=${encodeURIComponent(tempGoogleEmail)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBodyWithLink)}`;
  const mailtoUrl = `mailto:${encodeURIComponent(targetEmail)}?from=${encodeURIComponent(tempGoogleEmail)}&subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBodyWithLink)}`;
  const draftSendUrl = isMobile ? mailtoUrl : gmailComposeUrl;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${emailSubject}\n\n${emailBodyWithLink}`)}`;

  const handleCopyDraft = () => {
    const fullDraftText = `De: ${tempGoogleEmail}
Para: ${targetEmail}
Asunto: ${emailSubject}

${emailBodyWithLink}`;
    navigator.clipboard.writeText(fullDraftText).then(() => {
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-900/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[96vh] flex flex-col overflow-hidden border border-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="p-3.5 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/90 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-xs ${
              isSent ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
            }`}>
              {isSent ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 font-display leading-tight flex items-center gap-2">
                <span>{isSent ? '¡Valoración Lista y Enviada!' : 'Preparando Enlace...'}</span>
                <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  Amigo Secreto
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-stone-500">
                Valoración anónima para {session.targetPersonName || 'tu amigo/a'}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onOpenRectify}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors active:scale-98 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Rectificar notas</span>
              <span className="xs:hidden">Rectificar</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 flex flex-col md:flex-row items-center md:items-start justify-center gap-4 sm:gap-6 bg-[#FAF8F5]">
          
          {/* Left: Image Canvas Viewport */}
          <div className="w-full flex-1 flex flex-col items-center justify-center max-w-md">
            <div className="relative group rounded-2xl overflow-hidden shadow-lg border border-stone-300 bg-white flex items-center justify-center max-h-[38vh] sm:max-h-[48vh] md:max-h-[66vh]">
              <img
                src={imageUrl}
                alt="Resultado de la personalidad"
                className="w-auto h-full max-h-[38vh] sm:max-h-[48vh] md:max-h-[66vh] object-contain cursor-zoom-in"
                onClick={() => setIsZoomed(true)}
                title="Toca para ampliar imagen"
              />
              <button
                type="button"
                onClick={() => setIsZoomed(true)}
                className="absolute bottom-2 right-2 p-1.5 bg-stone-900/70 hover:bg-stone-900 text-white rounded-lg backdrop-blur-xs text-xs flex items-center gap-1 transition-all cursor-pointer"
                title="Ampliar imagen"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden sm:inline">Ampliar</span>
              </button>
            </div>
            <div className="text-[11px] text-stone-400 mt-1 flex items-center gap-1">
              <span>Resolución alta (1200 x 1750 px) · 50 cualidades</span>
            </div>
          </div>

          {/* Right: Dispatch Options Column */}
          <div className="w-full md:w-96 shrink-0 space-y-3.5">
            
            {/* 1. Loading/In-Progress State */}
            {isProcessing && (
              <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl shadow-sm space-y-2.5 animate-pulse">
                <div className="flex items-center gap-2.5">
                  <RefreshCw className="w-5 h-5 text-amber-600 animate-spin shrink-0" />
                  <div>
                    <h3 className="font-extrabold text-stone-900 text-xs">
                      Procesando enlace anónimo de 7 días
                    </h3>
                    <p className="text-[11px] text-stone-600">
                      {processingStatus}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Automated Anonymous Email Service Dispatch */}
            {isSent && !isProcessing && (
              <div className="bg-white border-2 border-emerald-500/90 p-4 rounded-2xl shadow-sm space-y-3 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-1 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-stone-900 text-xs sm:text-sm leading-tight">
                        Servicio de Envío Anónimo
                      </h3>
                      <p className="text-[10px] text-stone-500">
                        Envío directo sin revelar tu cuenta personal
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    100% Anónimo
                  </span>
                </div>

                {/* Headers */}
                <div className="space-y-1.5 text-xs text-stone-700">
                  <div className="flex items-center gap-2 p-2 bg-stone-50 rounded-xl border border-stone-200/80">
                    <span className="font-bold text-stone-400 w-12 shrink-0 text-[11px]">De:</span>
                    <span className="text-stone-900 font-bold text-xs truncate">
                      El Espejo de Amigos (Amigo Secreto)
                    </span>
                    <span className="text-[9px] font-extrabold uppercase tracking-wide text-emerald-800 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded-md ml-auto shrink-0">
                      Oculto
                    </span>
                  </div>

                  <div className="flex items-center gap-2 p-2 bg-stone-50 rounded-xl border border-stone-200/80">
                    <span className="font-bold text-stone-400 w-12 shrink-0 text-[11px]">Para:</span>
                    <span className="font-mono text-stone-900 font-bold text-xs truncate">
                      {targetEmail || 'correo-del-amigo@ejemplo.com'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 p-2 bg-stone-50 rounded-xl border border-stone-200/80">
                    <span className="font-bold text-stone-400 w-12 shrink-0 text-[11px]">Asunto:</span>
                    <span className="text-stone-800 font-medium text-xs truncate">
                      {emailSubject}
                    </span>
                  </div>
                </div>

                {/* Dispatch actions */}
                <div className="space-y-3 pt-1">
                  {/* Case A: Server not configured yet -> Ask for the 16-letter code right here (only once) */}
                  {isServerConfigured === false && targetEmail && (
                    <form onSubmit={handleSaveCodeAndSend} className="p-4 bg-amber-50/90 border border-amber-300 rounded-2xl space-y-3 animate-in fade-in">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Key className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-amber-950 text-xs sm:text-sm leading-tight">
                            Código del servidor (Se pide 1 sola vez)
                          </h4>
                          <p className="text-[11px] text-amber-900 leading-relaxed mt-0.5">
                            Pega el código de 16 letras de Google para activar el servidor. Se guardará para siempre y <strong>no se te volverá a pedir en las próximas valoraciones</strong>.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2.5 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">
                            Cuenta de Gmail emisora:
                          </label>
                          <input
                            type="email"
                            value={emitterEmail}
                            onChange={(e) => setEmitterEmail(e.target.value)}
                            placeholder="tu.correo@gmail.com"
                            required
                            className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-medium text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">
                            Código de Google (16 caracteres):
                          </label>
                          <input
                            type="password"
                            value={appPasswordCode}
                            onChange={(e) => {
                              setAppPasswordCode(e.target.value);
                              setCodeError(null);
                            }}
                            placeholder="abcd efgh ijkl mnop"
                            required
                            className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono font-medium text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                          />
                        </div>

                        {codeError && (
                          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 flex items-start gap-1.5 font-medium animate-in fade-in">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                            <span>{codeError}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={isSavingCode || !appPasswordCode.trim() || !emitterEmail.trim()}
                          className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isSavingCode ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          <span>{isSavingCode ? 'Activando servidor y enviando...' : `Guardar código y enviar a ${friendName}`}</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Case B: Server IS configured -> 1-click send, NEVER asks for code again */}
                  {isServerConfigured === true && targetEmail && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleSendViaService}
                        disabled={isSendingDirect}
                        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isSendingDirect ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        <span>{isSendingDirect ? 'Despachando correo anónimo...' : `Enviar correo anónimo a ${targetEmail}`}</span>
                      </button>

                      {directSendResult?.delivered && (
                        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-semibold space-y-1.5 animate-in fade-in">
                          <div className="flex items-center gap-1.5 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>¡Correo entregado con éxito a {targetEmail}!</span>
                          </div>
                          <p className="text-[11px] text-emerald-700 font-normal leading-relaxed">
                            El servidor ha transmitido el mensaje hacia <strong>{targetEmail}</strong> con remitente anónimo. Tu identidad personal no figura en ningún sitio.
                          </p>
                        </div>
                      )}

                      {directSendResult && !directSendResult.delivered && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1 animate-in fade-in">
                          <div className="flex items-center gap-1.5 font-bold">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>Error al despachar el correo</span>
                          </div>
                          <p className="text-[11px] text-rose-700 font-normal">
                            {directSendResult.error || 'Revisa que la dirección de correo esté bien escrita.'}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-stone-400 px-1 pt-0.5">
                        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                          <Check className="w-3 h-3 text-emerald-600" /> Servidor activo permanentemente
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsServerConfigured(false)}
                          className="hover:underline text-stone-500 cursor-pointer"
                        >
                          Cambiar código
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Case C: Loading server status */}
                  {isServerConfigured === null && targetEmail && (
                    <div className="py-2.5 text-center text-xs text-stone-400">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin inline-block mr-1.5 text-amber-600" />
                      <span>Comprobando estado del servidor...</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleCopyDraft}
                    className="w-full py-2 px-3 bg-stone-100 hover:bg-stone-200 active:scale-98 text-stone-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedDraft ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
                    <span>{copiedDraft ? '¡Texto copiado al portapapeles!' : 'Copiar texto del mensaje'}</span>
                  </button>

                  {/* Secondary Action: Enviar por WhatsApp */}
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer text-center"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    <span>Enviar por WhatsApp</span>
                  </a>
                  <p className="text-center text-[10px] text-stone-500 -mt-1 mb-1">
                    (El mensaje por WhatsApp no es anónimo)
                  </p>
                </div>
              </div>
            )}

            {/* 3. Direct Copy Link */}
            {shareUrl && (
              <div className="bg-stone-50 border border-stone-200 p-3 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px] text-stone-600 font-bold">
                  <span>Enlace directo para tu amigo/a:</span>
                  <span className="text-amber-700">Activo 7 días</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="w-full text-[11px] p-2 bg-white rounded-lg border border-stone-200 font-mono text-stone-700 truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-bold text-xs shrink-0 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* 4. Action Buttons: Download & Reset */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleDownload}
                className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 active:scale-98 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-stone-300 shrink-0" />
                <span>Descargar copia de la imagen PNG</span>
              </button>

              {onResetAll && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onResetAll();
                  }}
                  className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200 active:scale-98 text-stone-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                  <span>Hacer otra valoración desde cero</span>
                </button>
              )}
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-stone-200 bg-white flex justify-between items-center text-xs text-stone-500">
          <span>El Espejo de Amigos · Sin pop-ups · 100% Anónimo</span>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-stone-700 hover:text-stone-900 cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>

      {/* Fullscreen Zoom View */}
      {isZoomed && (
        <div 
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            <img
              src={imageUrl}
              alt="Póster a pantalla completa"
              className="max-h-[92vh] max-w-[95vw] object-contain rounded-lg shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              className="absolute top-2 right-2 p-2 bg-stone-800 text-white rounded-full hover:bg-stone-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* SMTP Configuration Modal */}
      <SmtpSettingsModal
        isOpen={isSmtpModalOpen}
        onClose={() => setIsSmtpModalOpen(false)}
        onConfigSaved={() => {
          setIsServerConfigured(true);
          handleSendViaService();
        }}
      />

    </div>
  );
};
