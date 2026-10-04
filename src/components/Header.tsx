import React from 'react';
import { HelpCircle, Sparkles, Image as ImageIcon, RotateCcw } from 'lucide-react';

interface HeaderProps {
  onOpenHelp: () => void;
  onOpenOriginalImage: () => void;
  onReset?: () => void;
  hasData?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHelp,
  onOpenOriginalImage,
  onReset,
  hasData = false,
}) => {
  return (
    <header className="border-b border-stone-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-3">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-100" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg sm:text-xl tracking-tight text-stone-900 leading-tight">
                Espejo de Amigos
              </h1>
              <p className="text-[11px] sm:text-xs text-stone-500">
                50 cualidades de personalidad valoradas del 1 al 10
              </p>
            </div>
          </div>

          {/* Utility Buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {hasData && onReset && (
              <button
                type="button"
                onClick={onReset}
                title="Reiniciar y empezar una nueva evaluación desde cero"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all shadow-2xs active:scale-98 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                <span>Reiniciar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenOriginalImage}
              title="Ver imagen de la hoja impresa original"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl transition-all shadow-2xs active:scale-98 cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5 text-stone-500" />
              <span className="hidden xs:inline">Hoja Original</span>
            </button>

            <button
              type="button"
              onClick={onOpenHelp}
              title="¿Cómo funciona el juego?"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/90 rounded-xl transition-all shadow-2xs active:scale-98 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden sm:inline">Instrucciones</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
