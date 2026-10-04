import React, { useEffect, useState } from 'react';
import { 
  Download, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  EyeOff, 
  RefreshCw, 
  Check, 
  ExternalLink,
  Lock,
  ArrowRight
} from 'lucide-react';
import { ShareMetadata } from '../types';
import { fetchShareMetadata, getAnonymousViewUrl, getAnonymousDownloadUrl } from '../utils/secureShareClient';

interface AnonymousSharedImageViewProps {
  token: string;
  onGoHome: () => void;
}

export const AnonymousSharedImageView: React.FC<AnonymousSharedImageViewProps> = ({
  token,
  onGoHome,
}) => {
  const [metadata, setMetadata] = useState<ShareMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [downloading, setDownloading] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      const meta = await fetchShareMetadata(token);

      if (!isMounted) return;

      if (!meta) {
        setError('El enlace temporal ha caducado, ha superado el límite de descargas o no existe.');
        setLoading(false);
        return;
      }

      setMetadata(meta);
      setRemainingSeconds(meta.remainingSeconds);
      setLoading(false);
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Live countdown timer
  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setError('El tiempo de validez de este enlace temporal ha finalizado.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds]);

  const formatCountdown = (totalSecs: number) => {
    if (totalSecs <= 0) return 'Expirado';
    const d = Math.floor(totalSecs / 86400);
    const h = Math.floor((totalSecs % 86400) / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;

    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const handleDownload = () => {
    setDownloading(true);
    const downloadUrl = getAnonymousDownloadUrl(token);

    // Trigger download via anchor
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = 'espejo-personalidad-anonimo.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setHasDownloaded(true);
    setDownloading(false);

    // Refresh metadata if it was 1 download limit
    if (metadata?.maxDownloads === 1) {
      setTimeout(() => {
        setError('Has utilizado la única descarga permitida para este enlace temporal. Por seguridad, el archivo ha sido eliminado.');
      }, 1500);
    } else if (metadata?.maxDownloads) {
      setMetadata(prev => prev ? {
        ...prev,
        downloadCount: prev.downloadCount + 1,
        remainingDownloads: Math.max(0, (prev.remainingDownloads ?? 1) - 1)
      } : null);
    }
  };

  const imageUrl = getAnonymousViewUrl(token);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-stone-200 max-w-sm w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto animate-spin">
            <RefreshCw className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-stone-900 font-display">
            Cargando valoración anónima...
          </h2>
          <p className="text-xs text-stone-500">
            Descifrando y validando el token de seguridad temporal.
          </p>
        </div>
      </div>
    );
  }

  if (error || !metadata) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200/80 max-w-md w-full text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-600 flex items-center justify-center mx-auto border border-stone-200">
            <Lock className="w-7 h-7 text-amber-700" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-stone-900 font-display">
              Enlace no disponible o caducado
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              {error || 'Por motivos de privacidad y seguridad, este enlace ha finalizado su período de validez o superó el límite de descargas.'}
            </p>
          </div>

          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 text-left space-y-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Protección de privacidad garantizada</span>
            </div>
            <p className="text-stone-600 text-[11px] leading-normal">
              Los archivos temporales se purgan automáticamente de nuestros servidores sin almacenar metadatos personales del emisor ni del receptor.
            </p>
          </div>

          <button
            type="button"
            onClick={onGoHome}
            className="w-full py-3.5 px-4 bg-stone-900 hover:bg-stone-800 active:scale-98 text-white font-bold text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Crear mi propio test de personalidad</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F0] text-stone-900 flex flex-col items-center p-3 sm:p-6 md:p-8">
      
      {/* Top Header Card */}
      <header className="max-w-3xl w-full bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-md border border-stone-200 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-stone-900 text-amber-300 font-black text-[10px] tracking-wider uppercase flex items-center gap-1">
                <EyeOff className="w-3 h-3" />
                100% Anónimo
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Token Criptográfico
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-stone-900 font-display">
              Has recibido una Valoración Anónima
            </h1>
            <p className="text-xs text-stone-500">
              Un amigo ha valorado tus 50 cualidades en <em>El Espejo de Amigos</em> con total sinceridad.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            {hasDownloaded ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            <span>{hasDownloaded ? 'Descargar de nuevo' : 'Descargar Imagen'}</span>
          </button>
        </div>

        {/* Expiration and Download Limit Warning Ribbon */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2.5 text-xs text-stone-600">
          <div className="flex items-center gap-1.5 font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
            <span>Caduca en: <strong>{formatCountdown(remainingSeconds)}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 font-medium text-stone-600">
            <Lock className="w-3.5 h-3.5 text-stone-400" />
            <span>
              Descargas:{' '}
              <strong className="text-stone-900">
                {metadata.maxDownloads 
                  ? `${metadata.remainingDownloads ?? 0} restantes de ${metadata.maxDownloads}` 
                  : 'Ilimitadas durante el periodo'}
              </strong>
            </span>
          </div>

          <div className="text-[11px] text-stone-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sin metadatos EXIF ni identidad del remitente</span>
          </div>
        </div>
      </header>

      {/* Image Preview Container */}
      <main className="max-w-3xl w-full flex flex-col items-center">
        <div className="w-full bg-white rounded-3xl p-3 sm:p-5 shadow-xl border border-stone-200/90 relative overflow-hidden flex flex-col items-center">
          
          <img
            src={imageUrl}
            alt="Tarjeta de Valoración Anónima"
            className="w-full h-auto max-h-[80vh] object-contain rounded-2xl shadow-inner border border-stone-100"
            loading="eager"
          />

          <div className="w-full mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-100">
            <p className="text-[11px] text-stone-500 text-center sm:text-left">
              💡 Guarda o descarga la imagen en tu dispositivo antes de que el enlace expire.
            </p>

            <button
              type="button"
              onClick={handleDownload}
              className="w-full sm:w-auto px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Guardar en el dispositivo</span>
            </button>
          </div>
        </div>

        {/* Footer Call to Action */}
        <section className="mt-8 max-w-xl w-full text-center space-y-3 bg-white/70 backdrop-blur-xs p-6 rounded-3xl border border-stone-200/80 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-stone-900 font-display">
            ¿Quieres saber qué opinan tus amigos de ti?
          </h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            Puedes hacer tu propia autoevaluación o enviar un enlace a tus amigos para que te valoren de forma sincera y anónima.
          </p>
          <button
            type="button"
            onClick={onGoHome}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Ir al Espejo de Amigos</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      </main>

    </div>
  );
};
