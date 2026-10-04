import React from 'react';
import { X, CheckCircle, Info } from 'lucide-react';
import { ADJECTIVES } from '../data/adjectives';

interface OriginalImageReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OriginalImageReferenceModal: React.FC<OriginalImageReferenceModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const col1 = ADJECTIVES.filter(a => a.column === 1);
  const col2 = ADJECTIVES.filter(a => a.column === 2);
  const col3 = ADJECTIVES.filter(a => a.column === 3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-200">
        
        {/* Header */}
        <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div>
            <h2 className="text-lg font-bold text-stone-900 font-display">
              Lista Original de los 50 Adjetivos
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Transcribimos y estructuramos con fidelidad los 50 rasgos de la hoja física del juego.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Columns Display */}
        <div className="p-6">
          <div className="mb-4 bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-900">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Fidelidad total:</strong> Se han incluido los 50 adjetivos repartidos en sus 3 columnas originales (17 en la primera, 18 en la segunda y 15 en la tercera), corrigiendo únicamente erratas tipográficas menores como <em>insesible &rarr; insensible</em>.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Columna 1 */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 pb-1 border-b border-stone-200">
                Columna 1 ({col1.length} rasgos)
              </div>
              <ul className="space-y-1.5 text-xs text-stone-700">
                {col1.map(item => (
                  <li key={item.id} className="flex items-center justify-between py-0.5 border-b border-stone-100 last:border-0">
                    <span className="font-medium text-stone-800">{item.word}</span>
                    <span className="text-[10px] text-stone-400 font-mono">#{item.id}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Columna 2 */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 pb-1 border-b border-stone-200">
                Columna 2 ({col2.length} rasgos)
              </div>
              <ul className="space-y-1.5 text-xs text-stone-700">
                {col2.map(item => (
                  <li key={item.id} className="flex items-center justify-between py-0.5 border-b border-stone-100 last:border-0">
                    <span className="font-medium text-stone-800">
                      {item.word} {item.originalText === 'insesible' && <span className="text-[9px] text-amber-600 font-normal">(insesible)</span>}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">#{item.id}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Columna 3 */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 pb-1 border-b border-stone-200">
                Columna 3 ({col3.length} rasgos)
              </div>
              <ul className="space-y-1.5 text-xs text-stone-700">
                {col3.map(item => (
                  <li key={item.id} className="flex items-center justify-between py-0.5 border-b border-stone-100 last:border-0">
                    <span className="font-medium text-stone-800">{item.word}</span>
                    <span className="text-[10px] text-stone-400 font-mono">#{item.id}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-stone-800 hover:bg-stone-900 text-white font-medium text-xs rounded-xl transition-colors"
          >
            Cerrar referencia
          </button>
        </div>

      </div>
    </div>
  );
};
