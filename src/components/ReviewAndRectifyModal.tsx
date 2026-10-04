import React, { useState, useMemo } from 'react';
import { 
  X, 
  Check, 
  Search, 
  Filter, 
  Sparkles, 
  AlertCircle,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  EyeOff,
  CheckCircle2,
  Clock,
  Send
} from 'lucide-react';
import { ScoreRecord, AdjectiveItem } from '../types';
import { ADJECTIVES } from '../data/adjectives';

interface ReviewAndRectifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  scores: ScoreRecord;
  targetPersonName: string;
  isSelf: boolean;
  onUpdateScore: (id: number, score: number) => void;
  onConfirmAndGenerateImage: () => void;
  isAnonymous?: boolean;
  setIsAnonymous?: (val: boolean) => void;
}

export const ReviewAndRectifyModal: React.FC<ReviewAndRectifyModalProps> = ({
  isOpen,
  onClose,
  scores,
  targetPersonName,
  isSelf,
  onUpdateScore,
  onConfirmAndGenerateImage,
  isAnonymous = false,
  setIsAnonymous,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'scored' | 'pending' | 'high' | 'mid' | 'low' | 1 | 2 | 3>('all');
  const [rectifiedIds, setRectifiedIds] = useState<Set<number>>(new Set());

  const safeScores = scores || {};

  const handleScoreChange = (id: number, newScore: number) => {
    const clamped = Math.max(1, Math.min(10, newScore));
    onUpdateScore(id, clamped);
    setRectifiedIds(prev => new Set(prev).add(id));
  };

  // Quick stats calculation based on actually scored items
  const stats = useMemo(() => {
    const entries = Object.entries(safeScores);
    const scoredCount = entries.length;
    const pendingCount = ADJECTIVES.length - scoredCount;

    if (scoredCount === 0) {
      return { avg: '0', highCount: 0, midCount: 0, lowCount: 0, scoredCount: 0, pendingCount };
    }

    const values = Object.values(safeScores);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = (sum / scoredCount).toFixed(1);
    const highCount = values.filter(v => v >= 8).length;
    const midCount = values.filter(v => v >= 5 && v < 8).length;
    const lowCount = values.filter(v => v < 5).length;

    return { avg, highCount, midCount, lowCount, scoredCount, pendingCount };
  }, [safeScores]);

  // Filtered traits
  const filteredList = useMemo(() => {
    return ADJECTIVES.filter(item => {
      const matchSearch = item.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.definition.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      const userScore = safeScores[item.id];
      const hasScore = userScore !== undefined;

      if (filterMode === 'scored') return hasScore;
      if (filterMode === 'pending') return !hasScore;
      
      const effectiveScore = userScore ?? 5;
      if (filterMode === 'high') return hasScore && effectiveScore >= 8;
      if (filterMode === 'mid') return hasScore && effectiveScore >= 5 && effectiveScore < 8;
      if (filterMode === 'low') return hasScore && effectiveScore < 5;
      if (typeof filterMode === 'number') return item.column === filterMode;

      return true;
    });
  }, [searchTerm, filterMode, safeScores]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-stone-900/80 backdrop-blur-xs">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full h-[96dvh] sm:h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-stone-200 bg-stone-50/90 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 rounded-md">
                Revisión y Rectificación
              </span>
              <span className="px-2 py-0.5 text-[11px] font-bold text-stone-700 bg-stone-200/80 rounded-md">
                {stats.scoredCount} de 50 puntuadas
              </span>
              {rectifiedIds.size > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-bold text-emerald-800 bg-emerald-100 rounded-md animate-pulse">
                  {rectifiedIds.size} cambiada(s)
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 font-display mt-1">
              Revisa las notas antes de crear la imagen
            </h2>
            <p className="text-[11px] sm:text-xs text-stone-500">
              {isSelf 
                ? 'Revisa tus respuestas para asegurarte de que reflejan tu autoimagen real.'
                : `Valoración para ${targetPersonName || 'tu amigo'}. Puedes modificar cualquier nota pulsando sobre ella.`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-200/60 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Summary Ribbon (Clear metrics) */}
        <div className="bg-stone-100/90 px-3.5 sm:px-5 py-2 border-b border-stone-200 flex items-center justify-between gap-3 text-xs overflow-x-auto">
          <div className="flex items-center gap-3 sm:gap-4 text-stone-700 whitespace-nowrap">
            <span>
              <strong>Puntuadas:</strong>{' '}
              <span className="font-bold text-stone-900">{stats.scoredCount} / 50</span>
            </span>
            <span className="text-stone-300">|</span>
            <span>
              <strong>Media:</strong>{' '}
              <span className="font-bold text-amber-900">{stats.avg} / 10</span>
            </span>
            <span className="text-stone-300">|</span>
            <span className="text-emerald-700 font-bold">
              Altas (8-10): {stats.highCount}
            </span>
            <span className="text-amber-700 font-bold">
              Medias (5-7): {stats.midCount}
            </span>
            <span className="text-rose-700 font-bold">
              Bajas (1-4): {stats.lowCount}
            </span>
          </div>

          <div className="text-[11px] text-stone-500 hidden md:flex items-center gap-1.5 whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Pulsa cualquier número (1-10) para rectificar la nota al instante</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 sm:p-4 border-b border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cualidad o definición..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                filterMode === 'all' ? 'bg-stone-900 text-white font-bold' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              Todas (50)
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('scored')}
              className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
                filterMode === 'scored' ? 'bg-amber-600 text-white font-bold' : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Puntuadas ({stats.scoredCount})</span>
            </button>
            {stats.pendingCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterMode('pending')}
                className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
                  filterMode === 'pending' ? 'bg-stone-800 text-white font-bold' : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pendientes ({stats.pendingCount})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setFilterMode('high')}
              className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                filterMode === 'high' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              Altas (8-10)
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('low')}
              className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                filterMode === 'low' ? 'bg-rose-600 text-white font-bold' : 'text-rose-800 hover:bg-rose-50'
              }`}
            >
              Bajas (1-4)
            </button>
          </div>
        </div>

        {/* Scrollable List of Adjectives to Rectify */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 divide-y divide-stone-100 bg-[#FCFBF9]">
          {filteredList.length === 0 ? (
            <div className="py-12 text-center text-stone-500 text-sm space-y-2">
              <p className="font-semibold text-stone-700">No se encontraron cualidades con ese filtro.</p>
              <button
                type="button"
                onClick={() => { setFilterMode('all'); setSearchTerm(''); }}
                className="text-amber-700 font-bold text-xs underline cursor-pointer"
              >
                Ver todas las cualidades
              </button>
            </div>
          ) : (
            filteredList.map(adj => {
              const currentScore = scores[adj.id];
              const isScored = currentScore !== undefined;
              const score = isScored ? currentScore : 5;
              const isRectified = rectifiedIds.has(adj.id);

              return (
                <div
                  key={adj.id}
                  className={`py-3.5 px-3 sm:px-4 rounded-2xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 my-1.5 border ${
                    isRectified 
                      ? 'bg-amber-50/80 border-amber-300/80 shadow-2xs' 
                      : isScored
                        ? 'bg-white border-stone-200/90 shadow-2xs'
                        : 'bg-stone-50/70 border-dashed border-stone-300'
                  }`}
                >
                  {/* Left: Info & Score Tag */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-stone-900 text-sm sm:text-base font-display">
                        {adj.word}
                      </span>

                      {/* Prominent Score Tag */}
                      {isScored ? (
                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg border shadow-2xs flex items-center gap-1 ${
                          score >= 8 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                            : score >= 5 
                              ? 'bg-amber-100 text-amber-800 border-amber-300' 
                              : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}>
                          <span>Nota: {score} / 10</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-stone-500 bg-stone-200/80 px-2 py-0.5 rounded-lg border border-stone-300">
                          Pendiente
                        </span>
                      )}

                      {isRectified && (
                        <span className="text-[10px] font-extrabold text-amber-900 bg-amber-200 px-1.5 py-0.5 rounded-sm">
                          Rectificado
                        </span>
                      )}

                      <span className="text-[10px] text-stone-400 font-mono">
                        Col {adj.column}
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 mt-1 line-clamp-1">
                      {adj.definition}
                    </p>
                  </div>

                  {/* Right: Quick Adjusters & 1-10 selector */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-2 w-full md:w-auto shrink-0 pt-1 md:pt-0">
                    
                    {/* Stepper (- / +) */}
                    <div className="flex items-center border border-stone-300 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleScoreChange(adj.id, score - 1)}
                        disabled={score <= 1}
                        className="px-2.5 py-1.5 text-stone-700 hover:bg-stone-100 disabled:opacity-30 font-extrabold text-sm cursor-pointer"
                        title="Restar 1"
                      >
                        -
                      </button>
                      <div className={`w-9 text-center font-black text-sm py-1.5 ${
                        !isScored 
                          ? 'bg-stone-100 text-stone-500'
                          : score >= 8 
                            ? 'bg-emerald-50 text-emerald-800' 
                            : score >= 5 
                              ? 'bg-amber-50 text-amber-900' 
                              : 'bg-rose-50 text-rose-800'
                      }`}>
                        {score}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleScoreChange(adj.id, score + 1)}
                        disabled={score >= 10}
                        className="px-2.5 py-1.5 text-stone-700 hover:bg-stone-100 disabled:opacity-30 font-extrabold text-sm cursor-pointer"
                        title="Sumar 1"
                      >
                        +
                      </button>
                    </div>

                    {/* Fast 1-10 Touch Palette */}
                    <div className="flex items-center gap-1 bg-stone-100/90 p-1 rounded-xl overflow-x-auto">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => {
                        const isSelected = isScored && score === val;
                        let activeColor = 'bg-stone-800 text-white';
                        if (val >= 8) activeColor = 'bg-emerald-600 text-white ring-2 ring-emerald-300';
                        else if (val >= 5) activeColor = 'bg-amber-500 text-white ring-2 ring-amber-300';
                        else activeColor = 'bg-rose-500 text-white ring-2 ring-rose-300';

                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleScoreChange(adj.id, val)}
                            className={`w-7 h-8 sm:w-7 sm:h-8 text-xs font-bold rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                              isSelected
                                ? `${activeColor} shadow-xs scale-105 font-black`
                                : 'text-stone-700 bg-white hover:bg-stone-50 hover:text-stone-900 border border-stone-200'
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-5 border-t border-stone-200 bg-stone-50/90 flex flex-col gap-3">
          
          {stats.pendingCount > 0 && (
            <div className="text-[11px] sm:text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Quedan <strong>{stats.pendingCount} cualidades pendientes</strong>. Si confirmas ahora, se les asignará puntuación media (5) automáticamente.
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 text-stone-600 hover:text-stone-900 font-semibold text-xs sm:text-sm rounded-xl hover:bg-stone-200/50 transition-colors order-2 sm:order-1 text-center cursor-pointer"
            >
              Volver al cuestionario
            </button>

            <button
              type="button"
              onClick={onConfirmAndGenerateImage}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-98 order-1 sm:order-2 cursor-pointer"
            >
              <Send className="w-5 h-5 shrink-0" />
              <span>Enviar imagen a {targetPersonName || 'mi amigo/a'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
