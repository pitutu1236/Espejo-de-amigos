import React, { useState, useEffect } from 'react';
import { DownloadCloud, Smartphone, X, Check, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallAppBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 1. Check if already installed / standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Check iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    // 3. Listen to beforeinstallprompt (Chromium / Android / Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Listen to appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (isInstalled || isDismissed) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSInstructions(true);
    }
  };

  return (
    <>
      {/* Install Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-stone-900 text-white px-3.5 py-2.5 shadow-md flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4 text-amber-200" />
          </div>
          <div className="truncate">
            <span className="font-extrabold block xs:inline">Instalar app en tu móvil: </span>
            <span className="text-amber-100 text-[11px] hidden sm:inline">Funciona sin internet y se abre como app nativa</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-1 bg-white text-stone-900 hover:bg-amber-50 active:scale-95 font-bold rounded-lg shadow-xs transition-all flex items-center gap-1.5"
          >
            <DownloadCloud className="w-3.5 h-3.5 text-amber-600" />
            <span>Instalar</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 text-white/70 hover:text-white rounded-md transition-colors"
            title="Cerrar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 text-stone-900 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base font-display">Instalar en iPhone / iPad</h3>
              <button
                type="button"
                onClick={() => setShowIOSInstructions(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-stone-600">
              <p>
                En Safari de iOS puedes instalarla directamente en tu pantalla de inicio en 2 pasos:
              </p>
              <div className="flex items-start gap-2.5 p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0">1</span>
                <div>
                  Pulsa el botón <strong>Compartir</strong> <Share className="w-3.5 h-3.5 inline mx-1 text-blue-600" /> en la barra inferior de Safari.
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0">2</span>
                <div>
                  Baja y pulsa en <strong>«Añadir a la pantalla de inicio»</strong>.
                </div>
              </div>
              <p className="text-[11px] text-stone-500 pt-1">
                La app aparecerá en tu móvil con su icono oficial y funcionará exactamente igual que una app descargada.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSInstructions(false)}
              className="w-full py-2.5 bg-stone-900 text-white font-bold text-xs rounded-xl"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
