import React from 'react';
import { X, CheckCircle2, AlertTriangle, ArrowRight, HeartHandshake, Eye, Sparkles } from 'lucide-react';

interface GameExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartEvaluation: () => void;
}

export const GameExplanationModal: React.FC<GameExplanationModalProps> = ({
  isOpen,
  onClose,
  onStartEvaluation,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200">
        
        {/* Header */}
        <div className="p-6 border-b border-stone-100 flex items-start justify-between bg-stone-50/50">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-sm">
              Dinámica del Juego
            </span>
            <h2 className="text-xl font-bold text-stone-900 mt-2 font-display">
              ¿Para qué sirve el Espejo de Amigos?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm text-stone-700 leading-relaxed">
          <p className="text-stone-800 font-medium">
            Es un método de autoconocimiento interpersonal basado en la sinceridad y la confianza mutua entre amigos:
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3.5 bg-amber-50/60 border border-amber-200/70 rounded-xl">
              <div className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                1
              </div>
              <div>
                <h4 className="font-semibold text-stone-900">Autoevaluación previa</h4>
                <p className="text-xs text-stone-600 mt-0.5">
                  Primero, la persona puntúa del 1 al 10 cómo se percibe a sí misma en las 50 características de personalidad.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 bg-blue-50/60 border border-blue-200/70 rounded-xl">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                2
              </div>
              <div>
                <h4 className="font-semibold text-stone-900">Valoración sincera del amigo (obligatorio las 50)</h4>
                <p className="text-xs text-stone-600 mt-0.5">
                  El amigo puntúa las 50 características sin dejar ni una sola en blanco y sin conocer las notas previas, garantizando total honestidad sin sesgos.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 bg-purple-50/60 border border-purple-200/70 rounded-xl">
              <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                3
              </div>
              <div>
                <h4 className="font-semibold text-stone-900">Fase de Rectificación final</h4>
                <p className="text-xs text-stone-600 mt-0.5">
                  Antes de crear la imagen definitiva, se revisa la lista completa para rectificar cualquier nota que se desee ajustar.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 bg-emerald-50/60 border border-emerald-200/70 rounded-xl">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                4
              </div>
              <div>
                <h4 className="font-semibold text-stone-900">Generación de Imagen y Aprendizaje</h4>
                <p className="text-xs text-stone-600 mt-0.5">
                  Se genera una imagen nítida con todas las puntuaciones listas para reenviar. Al recibirla, tu amigo descubre sus <strong>puntos ciegos</strong> (virtudes que no sabía que transmitía o actitudes que creía disimular) y qué aspectos puede mejorar en su personalidad.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-stone-50 border border-stone-200 p-3.5 rounded-xl text-xs text-stone-600 flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              <strong>Consejo:</strong> La sinceridad con empatía es el mayor regalo que dos amigos pueden hacerse. ¡Sin rencores y con mentalidad de crecimiento!
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-stone-100 bg-stone-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-stone-600 hover:text-stone-900 font-medium text-sm rounded-xl transition-colors"
          >
            Entendido, cerrar
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onStartEvaluation();
            }}
            className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors"
          >
            <span>Empezar a puntuar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
