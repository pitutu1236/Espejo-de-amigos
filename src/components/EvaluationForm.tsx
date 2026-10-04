import React, { useState, useMemo, useRef } from 'react';
import { 
  Check, 
  Columns3, 
  ListFilter, 
  ArrowRight, 
  ArrowLeft, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Filter, 
  EyeOff, 
  ShieldCheck, 
  UserCheck, 
  Mail, 
  User 
} from 'lucide-react';
import { ScoreRecord } from '../types';
import { ADJECTIVES } from '../data/adjectives';

interface EvaluationFormProps {
  isSelf: boolean;
  targetPersonName: string;
  setTargetPersonName: (name: string) => void;
  targetEmail?: string;
  setTargetEmail?: (email: string) => void;
  scores: ScoreRecord;
  onSetScore: (id: number, score: number) => void;
  onOpenRectify: () => void;
  onResetScores: () => void;
  isAnonymous?: boolean;
  setIsAnonymous?: (val: boolean) => void;
}

export const EvaluationForm: React.FC<EvaluationFormProps> = ({
  isSelf,
  targetPersonName,
  setTargetPersonName,
  targetEmail = '',
  setTargetEmail,
  scores,
  onSetScore,
  onOpenRectify,
  onResetScores,
  isAnonymous = true,
  setIsAnonymous,
}) => {
  const [viewMode, setViewMode] = useState<'sheet' | 'list'>('sheet');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedColumnFilter, setSelectedColumnFilter] = useState<'all' | 1 | 2 | 3>('all');
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  const [activeTooltipId, setActiveTooltipId] = useState<number | null>(null);

  // Form fields validation states and refs
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    email?: string;
  }>({});
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const handleAttemptOpenRectify = () => {
    const errors: { name?: string; email?: string } = {};
    const trimmedName = targetPersonName.trim();
    const trimmedEmail = (targetEmail || '').trim();

    if (!trimmedName) {
      errors.name = 'Indica el nombre del amigo a evaluar';
    }

    if (!trimmedEmail) {
      errors.email = 'Indica el email del amigo a evaluar';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Introduce un email válido (ej: nombre@correo.com)';
    }

    if (errors.name || errors.email) {
      setValidationErrors(errors);
      if (errors.name && nameInputRef.current) {
        nameInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        nameInputRef.current.focus();
      } else if (errors.email && emailInputRef.current) {
        emailInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        emailInputRef.current.focus();
      }
      return;
    }

    setValidationErrors({});
    onOpenRectify();
  };

  // Rated count & pending count
  const ratedCount = useMemo(() => {
    return Object.keys(scores).length;
  }, [scores]);

  const totalTraits = ADJECTIVES.length; // 50
  const pendingCount = totalTraits - ratedCount;
  const isComplete = ratedCount === totalTraits;
  const progressPercent = Math.min(100, Math.round((ratedCount / totalTraits) * 100));

  // Filtered list for 'list' and 'sheet' modes
  const filteredAdjectives = useMemo(() => {
    return ADJECTIVES.filter(a => {
      if (showOnlyPending && scores[a.id] !== undefined) return false;
      const matchSearch = a.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.definition.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;
      if (selectedColumnFilter !== 'all' && a.column !== selectedColumnFilter) return false;
      return true;
    });
  }, [searchTerm, selectedColumnFilter, showOnlyPending, scores]);

  // Helper for score button styling with rich mobile/desktop palette
  const getScoreColorClass = (val: number, isSelected: boolean) => {
    if (!isSelected) {
      return 'bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-700 border-stone-200/90 font-medium active:scale-95 shadow-2xs';
    }
    if (val >= 8) {
      return 'bg-emerald-600 active:bg-emerald-700 text-white border-emerald-700 shadow-xs font-black ring-2 ring-emerald-300/60 scale-102';
    }
    if (val >= 5) {
      return 'bg-amber-500 active:bg-amber-600 text-white border-amber-600 shadow-xs font-black ring-2 ring-amber-300/60 scale-102';
    }
    return 'bg-rose-500 active:bg-rose-600 text-white border-rose-600 shadow-xs font-black ring-2 ring-rose-300/60 scale-102';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Top Banner / Participant Configuration Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-stone-200/80 shadow-xs space-y-4">
        
        {/* Top Header Row with Progress */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[11px] sm:text-xs font-bold uppercase rounded-md tracking-wider bg-amber-100 text-amber-800">
                Valoración de Amigo
              </span>
              <span className="text-[11px] sm:text-xs text-stone-500">
                Puntúa del 1 al 10 las 50 cualidades
              </span>
            </div>
            
            {/* Required Title */}
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 font-display mt-1.5 leading-snug">
              Evalúa las siguientes características de tu amigo
            </h2>
          </div>

          {/* Progress Indicator Widget & Quick Review Button */}
          <div className="flex items-center gap-2.5 sm:gap-3 bg-stone-50/80 p-2 sm:p-2.5 rounded-2xl border border-stone-200/60 shrink-0 self-start sm:self-auto w-full sm:w-auto justify-between sm:justify-start">
            <div>
              <div className="text-[11px] text-stone-500 font-medium">Progreso</div>
              <div className="text-sm sm:text-base font-extrabold text-stone-900">
                {ratedCount} <span className="text-xs font-normal text-stone-400">/ {totalTraits} puntuadas</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center relative font-extrabold text-xs text-stone-800">
                <svg className="w-10 h-10 absolute -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-stone-200"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={isComplete ? 'text-emerald-500 transition-all duration-300' : 'text-amber-500 transition-all duration-300'}
                    strokeDasharray={`${progressPercent}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span>{progressPercent}%</span>
              </div>

              {ratedCount > 0 && (
                <button
                  type="button"
                  onClick={handleAttemptOpenRectify}
                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                  title="Revisar y rectificar las opciones que has puntuado"
                >
                  <span>Revisar ({ratedCount})</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Validation Warning Alert Banner if inputs are missing */}
        {(validationErrors.name || validationErrors.email) && (
          <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm text-rose-950 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200 shadow-2xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="block font-bold text-rose-900 text-sm">
                ¡Faltan datos obligatorios antes de revisar!
              </strong>
              <p className="text-rose-800 leading-relaxed">
                Para poder acceder a la revisión y emitir la imagen final, debes rellenar tanto el <strong>nombre de tu amigo</strong> como su <strong>email</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Input: Name and Email side-by-side at the start */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-stone-100">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-700" />
              <span>Nombre del amigo a evaluar *</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              placeholder="Ej: Daniel, Sofía, Lucas..."
              value={targetPersonName}
              onChange={e => {
                setTargetPersonName(e.target.value);
                if (validationErrors.name) {
                  setValidationErrors(prev => ({ ...prev, name: undefined }));
                }
              }}
              className={`w-full px-3.5 py-2.5 bg-stone-50/80 border rounded-xl text-stone-900 font-semibold text-sm focus:outline-hidden transition-all shadow-2xs ${
                validationErrors.name
                  ? 'border-rose-400 ring-2 ring-rose-200 bg-rose-50/40'
                  : 'border-stone-200 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500'
              }`}
            />
            {validationErrors.name && (
              <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{validationErrors.name}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-amber-700" />
              <span>Email del amigo *</span>
            </label>
            <input
              ref={emailInputRef}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="ejemplo@correo.com"
              value={targetEmail || ''}
              onChange={e => {
                if (setTargetEmail) setTargetEmail(e.target.value);
                if (validationErrors.email) {
                  setValidationErrors(prev => ({ ...prev, email: undefined }));
                }
              }}
              className={`w-full px-3.5 py-2.5 bg-stone-50/80 border rounded-xl text-stone-900 font-medium text-sm focus:outline-hidden transition-all shadow-2xs placeholder-stone-400 ${
                validationErrors.email
                  ? 'border-rose-400 ring-2 ring-rose-200 bg-rose-50/40'
                  : 'border-stone-200 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500'
              }`}
            />
            {validationErrors.email && (
              <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{validationErrors.email}</span>
              </p>
            )}
          </div>
        </div>

        {/* View Switcher & Helper Actions Bar (Responsive on Mobile) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-stone-100">
          
          {/* Mode Switcher Buttons */}
          <div className="grid grid-cols-2 bg-stone-100/90 p-1 rounded-xl text-xs font-semibold text-stone-600 gap-0.5">
            <button
              type="button"
              onClick={() => setViewMode('sheet')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'sheet' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'hover:text-stone-900'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              <span>3 Columnas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'hover:text-stone-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              <span>Lista</span>
            </button>
          </div>

          {/* Pending Toggle & Reset */}
          <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
            {pendingCount > 0 ? (
              <button
                type="button"
                onClick={() => setShowOnlyPending(prev => !prev)}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl font-bold border transition-all active:scale-98 ${
                  showOnlyPending
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                    : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{showOnlyPending ? 'Ver todas' : `Pendientes (${pendingCount})`}</span>
              </button>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl font-bold text-xs">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                ¡Todas puntuadas!
              </span>
            )}

            <button
              type="button"
              onClick={onResetScores}
              className="px-2.5 py-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-medium"
              title="Reiniciar puntuaciones"
            >
              Reiniciar
            </button>
          </div>

        </div>

      </div>

      {/* Mandatory Notice Banner when traits are incomplete */}
      {!isComplete && (
        <div className="bg-amber-50/95 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm text-amber-950 shadow-2xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <strong>Obligatorio puntuar las 50 características:</strong> No puede quedar ninguna sin nota para poder acceder a la revisión y reenviar la imagen.
              <span className="block sm:inline sm:ml-1 font-extrabold text-amber-900">
                (Faltan {pendingCount}).
              </span>
            </div>
          </div>
          {pendingCount > 0 && !showOnlyPending && (
            <button
              type="button"
              onClick={() => setShowOnlyPending(true)}
              className="w-full sm:w-auto shrink-0 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold rounded-xl text-xs transition-all shadow-2xs text-center"
            >
              Filtrar pendientes ahora
            </button>
          )}
        </div>
      )}

      {/* VIEW MODE 1: SHEET 3 COLUMNS (RESPONSIVE: 5 COLUMNS ON MOBILE, 10 ON DESKTOP) */}
      {viewMode === 'sheet' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {[1, 2, 3].map(colNum => {
            const colItems = ADJECTIVES.filter(a => {
              if (a.column !== colNum) return false;
              if (showOnlyPending && scores[a.id] !== undefined) return false;
              if (searchTerm) {
                const matchSearch = a.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  a.definition.toLowerCase().includes(searchTerm.toLowerCase());
                if (!matchSearch) return false;
              }
              return true;
            });

            const totalInCol = ADJECTIVES.filter(a => a.column === colNum).length;
            const ratedInCol = ADJECTIVES.filter(a => a.column === colNum && scores[a.id] !== undefined).length;
            const isColComplete = ratedInCol === totalInCol;

            return (
              <div
                key={colNum}
                className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-stone-200/80 shadow-xs flex flex-col space-y-3"
              >
                {/* Column Header Ribbon */}
                <div className="flex items-center justify-between pb-2.5 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center">
                      {colNum}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                      Columna {colNum}
                    </span>
                  </div>
                  <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                    isColComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {ratedInCol} / {totalInCol}
                  </span>
                </div>

                {colItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-stone-400">
                    {showOnlyPending ? '¡Todas las de esta columna están listas!' : 'No se encontraron adjetivos'}
                  </div>
                ) : (
                  <div className="space-y-3 flex-1">
                    {colItems.map(adj => {
                      const score = scores[adj.id];
                      const isTooltipOpen = activeTooltipId === adj.id;
                      const isPending = score === undefined;

                      return (
                        <div
                          key={adj.id}
                          className={`p-3 rounded-2xl border transition-all space-y-2 ${
                            isPending 
                              ? 'border-amber-200/90 bg-amber-50/40' 
                              : 'border-stone-100 bg-stone-50/40 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-bold text-stone-900 text-sm truncate">
                                {adj.word}
                              </span>
                              <button
                                type="button"
                                onClick={() => setActiveTooltipId(isTooltipOpen ? null : adj.id)}
                                className="text-stone-400 hover:text-stone-600 p-0.5 shrink-0"
                                title={adj.definition}
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="shrink-0">
                              {score !== undefined ? (
                                <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg shadow-2xs ${
                                  score >= 8 
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                    : score >= 5 
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}>
                                  {score} pts
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-lg border border-amber-200/60 animate-pulse">
                                  Pendiente
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Definition tooltip */}
                          {isTooltipOpen && (
                            <p className="text-[11px] text-stone-600 bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs">
                              {adj.definition}
                            </p>
                          )}

                          {/* Responsive 1..10 Selector: 5 columns on mobile (Row 1: 1-5, Row 2: 6-10), 10 columns on desktop */}
                          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 sm:gap-1 pt-1">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => onSetScore(adj.id, val)}
                                className={`h-8 sm:h-7 rounded-lg text-xs font-bold border transition-all flex items-center justify-center ${
                                  getScoreColorClass(val, score === val)
                                }`}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 2: LIST WITH SEARCH */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-stone-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pb-3 border-b border-stone-100">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar característica o significado..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl"
              />
            </div>

            <div className="flex items-center gap-1 text-xs self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedColumnFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap ${
                  selectedColumnFilter === 'all' ? 'bg-stone-900 text-white font-bold' : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                Todas
              </button>
              {[1, 2, 3].map(col => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setSelectedColumnFilter(col as 1 | 2 | 3)}
                  className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap ${
                    selectedColumnFilter === col ? 'bg-stone-900 text-white font-bold' : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Col {col}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-stone-100">
            {filteredAdjectives.map(adj => {
              const score = scores[adj.id];
              const isPending = score === undefined;

              return (
                <div key={adj.id} className={`py-3 sm:py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  isPending ? 'bg-amber-50/40 px-2.5 rounded-xl border border-amber-200/50 my-1' : ''
                }`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 text-base">
                        {adj.word}
                      </span>
                      {isPending ? (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                          Falta nota
                        </span>
                      ) : (
                        <span className="text-[10px] text-stone-400 font-mono">
                          Col {adj.column}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {adj.definition}
                    </p>
                  </div>

                  {/* Responsive 1..10 button grid in list view */}
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 shrink-0 w-full sm:w-auto">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => onSetScore(adj.id, val)}
                        className={`h-8 sm:h-8 sm:w-8 rounded-lg text-xs font-bold border transition-all flex items-center justify-center ${
                          getScoreColorClass(val, score === val)
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Prominent Bottom Action Bar: Mobile & Desktop Optimized */}
      <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-5 border shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 sticky bottom-2 sm:bottom-4 z-20 backdrop-blur-md ${
        isComplete 
          ? 'bg-white/95 border-emerald-400 ring-2 ring-emerald-500/20' 
          : 'bg-white/95 border-stone-300'
      }`}>
        <div className="w-full sm:w-auto text-center sm:text-left">
          <div className="font-extrabold text-stone-900 text-sm sm:text-base flex items-center justify-center sm:justify-start gap-2">
            {isComplete ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-emerald-900">¡50 de 50 puntuadas! Listo para revisar</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Puntuadas {ratedCount} de 50 cualidades</span>
              </>
            )}
          </div>
          <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5">
            {isComplete
              ? 'Pulsa para revisar todas las puntuaciones antes de crear la imagen definitiva.'
              : ratedCount > 0
                ? `Puedes revisar y rectificar las ${ratedCount} notas que llevas o completar las ${pendingCount} pendientes.`
                : 'Puntúa del 1 al 10 para ver las notas aquí y en la imagen final.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleAttemptOpenRectify}
          className={`w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-3.5 font-extrabold text-sm sm:text-base rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isComplete
              ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white hover:shadow-lg transform active:scale-98'
              : ratedCount > 0
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white hover:shadow-lg transform active:scale-98'
                : 'bg-stone-800 hover:bg-stone-900 text-white hover:shadow-md'
          }`}
        >
          <span>
            {isComplete
              ? `Revisar y Enviar Imagen a ${targetPersonName || 'tu amigo/a'}`
              : ratedCount > 0
                ? `Revisar puntuaciones (${ratedCount} de 50)`
                : 'Ver y revisar lista de cualidades'}
          </span>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </button>
      </div>

    </div>
  );
};
