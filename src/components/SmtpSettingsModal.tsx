import React, { useState, useEffect } from 'react';
import { 
  X, 
  Server, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Send, 
  Key, 
  Mail, 
  ShieldCheck,
  ExternalLink,
  HelpCircle
} from 'lucide-react';
import { getSmtpConfig, saveSmtpConfig, sendTestEmail } from '../utils/secureShareClient';

interface SmtpSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

export const SmtpSettingsModal: React.FC<SmtpSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [host, setHost] = useState('smtp.gmail.com');
  const [port, setPort] = useState(465);
  const [secure, setSecure] = useState(true);
  const [user, setUser] = useState('espejodeamigos.notifica@gmail.com');
  const [pass, setPass] = useState('');
  const [fromName, setFromName] = useState('El Espejo de Amigos (Amigo Secreto)');
  const [fromEmail, setFromEmail] = useState('espejodeamigos.notifica@gmail.com');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');

  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCurrentConfig();
    }
  }, [isOpen]);

  const loadCurrentConfig = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const config = await getSmtpConfig();
      if (config.configured && config.settings) {
        setHost(config.settings.host || 'smtp.gmail.com');
        setPort(config.settings.port || 465);
        setSecure(config.settings.secure !== false);
        setUser(config.settings.user || '');
        setFromName(config.settings.fromName || 'El Espejo de Amigos (Amigo Secreto)');
        setFromEmail(config.settings.fromEmail || config.settings.user || '');
        if (config.settings.user) {
          setTestEmailAddress(config.settings.user);
        }
      }
    } catch (err: any) {
      console.warn('Error loading SMTP config', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.trim() || !pass.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Por favor, introduce el correo emisor y la contraseña de aplicación.',
      });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    const effectiveFromEmail = fromEmail.trim() || user.trim();

    try {
      const res = await saveSmtpConfig({
        host: host.trim(),
        port: Number(port),
        secure: Boolean(secure),
        user: user.trim(),
        pass: pass.trim(),
        fromName: fromName.trim() || 'El Espejo de Amigos (Amigo Secreto)',
        fromEmail: effectiveFromEmail,
      });

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: '✓ Conexión establecida con éxito. Los correos se entregarán a los buzones reales.',
        });
        if (onConfigSaved) {
          onConfigSaved();
        }
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'No se pudo conectar con el servidor de correo.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error de conexión con el servidor.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSend = async () => {
    if (!testEmailAddress.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Introduce un correo de prueba para verificar la entrega.',
      });
      return;
    }

    setIsTesting(true);
    setStatusMessage(null);

    try {
      const res = await sendTestEmail(testEmailAddress.trim());
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `✓ Correo de prueba enviado con éxito a ${testEmailAddress.trim()}. ¡Revisa tu bandeja de entrada!`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Error al enviar la prueba.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error de red.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-stone-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 leading-tight">
                Conectar Servidor de Correo (SMTP)
              </h2>
              <p className="text-[11px] text-stone-500">
                Permite la entrega real en buzones de Yahoo, Gmail y Outlook
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-2 text-stone-700">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>¿Por qué es indispensable este paso?</span>
            </div>
            <p className="text-[11px] leading-relaxed text-stone-600">
              Servicios como <strong>Yahoo</strong> y <strong>Gmail</strong> rechazan y destruyen cualquier correo enviado desde internet que no provenga de un servidor autenticado. Para que tu amigo reciba el mensaje anónimo en su bandeja real, el servidor necesita una cuenta de salida autenticada.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-3.5">
            {/* User / Email */}
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                Cuenta de correo emisora (ej. Gmail secundaria o de pruebas):
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                <input
                  type="email"
                  value={user}
                  onChange={(e) => {
                    setUser(e.target.value);
                    if (!fromEmail) setFromEmail(e.target.value);
                  }}
                  placeholder="mi.cuenta.temporal@gmail.com"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-xs font-medium"
                />
              </div>
            </div>

            {/* App Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-stone-700">
                  Contraseña de aplicación de Google (16 caracteres):
                </label>
                <button
                  type="button"
                  onClick={() => setShowGuide(!showGuide)}
                  className="text-[11px] text-amber-700 hover:underline font-semibold cursor-pointer flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>¿Cómo obtenerla?</span>
                </button>
              </div>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                <input
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="abcd efgh ijkl mnop"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-xs font-mono font-medium"
                />
              </div>
              <p className="text-[10px] text-stone-500 mt-1">
                No uses tu contraseña normal de Google. Google requiere una <em>Contraseña de Aplicación</em> para envíos automáticos.
              </p>
            </div>

            {/* Guide Accordion */}
            {showGuide && (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-[11px] text-stone-600 space-y-2 animate-in fade-in">
                <div className="font-bold text-stone-900 flex items-center gap-1">
                  <span>Pasos para crear tu contraseña de aplicación en Google (1 minuto):</span>
                </div>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Entra en <strong>myaccount.google.com/security</strong>.</li>
                  <li>Asegúrate de tener activa la <strong>Verificación en dos pasos</strong>.</li>
                  <li>En el buscador de arriba escribe <strong>Contraseñas de aplicaciones</strong>.</li>
                  <li>Crea una nueva con el nombre "Espejo" y copia los 16 caracteres generados.</li>
                  <li>Pégalos en el campo de arriba.</li>
                </ol>
              </div>
            )}

            {/* From Name */}
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                Nombre que verá el amigo como remitente:
              </label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="El Espejo de Amigos (Amigo Secreto)"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-xs"
              />
              <p className="text-[10px] text-stone-500 mt-1">
                Este es el nombre visible que aparecerá en la bandeja de entrada del amigo.
              </p>
            </div>

            {/* Status message */}
            {statusMessage && (
              <div className={`p-3 rounded-xl border flex items-start gap-2 ${
                statusMessage.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold' 
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                {statusMessage.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span className="text-[11px] leading-relaxed">{statusMessage.text}</span>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{isSaving ? 'Verificando y conectando...' : 'Guardar y Activar Servidor'}</span>
              </button>
            </div>
          </form>

          {/* Test Section */}
          <div className="pt-3 border-t border-stone-200 space-y-2">
            <label className="block font-bold text-stone-700">
              Probar entrega real en bandeja de entrada:
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="tu.correo@gmail.com"
                className="flex-1 px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs"
              />
              <button
                type="button"
                onClick={handleTestSend}
                disabled={isTesting}
                className="py-2 px-3 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Probar</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-stone-200 bg-stone-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-bold text-stone-600 hover:text-stone-900 text-xs cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
