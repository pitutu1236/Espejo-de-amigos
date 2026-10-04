import React, { useState, useMemo } from 'react';
import { 
  GitCompare, 
  Sparkles, 
  AlertCircle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  ArrowRight,
  ExternalLink,
  Download,
  Info
} from 'lucide-react';
import { ScoreRecord, ComparisonDiff } from '../types';
import { ADJECTIVES } from '../data/adjectives';
import { calculateComparison } from '../utils/shareUtils';
import { generateEvaluationImage, downloadImage } from '../utils/imageGenerator';

interface ComparisonViewProps {
  selfScores: ScoreRecord;
  friendScores: ScoreRecord;
  targetPersonName: string;
  evaluatorName: string;
  onNavigateToSelf: () => void;
  onNavigateToFriend: () => void;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  selfScores,
  friendScores,
  targetPersonName,
  evaluatorName,
  onNavigateToSelf,
  onNavigateToFriend,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'growth' | 'positive_blind' | 'aligned'>('all');
  const [isGeneratingCompareImage, setIsGeneratingCompareImage] = useState(false);

  const selfCount = Object.keys(selfScores).length;
  const friendCount = Object.keys(friendScores).length;

  const comparison = useMemo(() => {
    return calculateComparison(selfScores, friendScores);
  }, [selfScores, friendScores]);

  // Major discrepancies
  // Positive blind spots: Friend rated trait significantly higher than self (for positive traits)
  const positiveBlindSpots = useMemo(() => {
    return comparison
      .filter(c => c.diff >= 2 && c.adjective.tone !== 'constructivo')
      .sort((a, b) => b.diff - a.diff);
  }, [comparison]);

  // Areas to improve:
  // - Friend rated a constructivo trait significantly higher than self (e.g. egoísta, cabezota, intolerante)
  // - OR Friend rated a positive trait significantly lower than self (e.g. paciente, confiable, generoso)
  const growthOpportunities = useMemo(() => {
    return comparison
      .filter(c => {
        if (c.adjective.tone === 'constructivo' && c.diff >= 2) return true; // friend sees more flaw
        if (c.adjective.tone !== 'constructivo' && c.diff <= -2) return true; // friend sees less virtue
        return false;
      })
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [comparison]);

  // Mutual strengths
  const sharedStrengths = useMemo(() => {
    return comparison
      .filter(c => c.selfScore >= 7 && c.friendScore >= 7 && c.adjective.tone !== 'constructivo')
      .sort((a, b) => (b.selfScore + b.friendScore) - (a.selfScore + a.friendScore));
  }, [comparison]);

  // Filtered comparison table
  const filteredRows = useMemo(() => {
    return comparison.filter(c => {
      const matchSearch = c.adjective.word.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      if (filterType === 'growth') {
        return growthOpportunities.some(g => g.adjective.id === c.adjective.id);
      }
      if (filterType === 'positive_blind') {
        return positiveBlindSpots.some(p => p.adjective.id === c.adjective.id);
      }
      if (filterType === 'aligned') {
        return Math.abs(c.diff) <= 1;
      }
      return true;
    });
  }, [comparison, searchTerm, filterType, growthOpportunities, positiveBlindSpots]);

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-bold uppercase rounded-md tracking-wider bg-indigo-100 text-indigo-800">
                El Espejo Revelado
              </span>
              <span className="text-xs text-stone-500">
                Autoevaluación vs Valoración de tu amigo
              </span>
            </div>
            <h2 className="text-2xl font-bold text-stone-900 font-display mt-1">
              Comparativa: ¿Cómo te ves vs Cómo te ve tu amigo?
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl">
              Aquí es donde ocurre la magia del juego: descubrir en qué virtudes no te dabas suficiente crédito y qué áreas de mejora puedes trabajar para pulir tu personalidad.
            </p>
          </div>

          {/* Quick status counters */}
          <div className="flex items-center gap-3">
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Autoevaluación</span>
              <span className="text-sm font-bold text-stone-800">{selfCount} / 50</span>
            </div>
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Amigo</span>
              <span className="text-sm font-bold text-stone-800">{friendCount} / 50</span>
            </div>
          </div>
        </div>

        {/* Warning if any side is missing data */}
        {(selfCount < 10 || friendCount < 10) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-start gap-2.5">
              <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Faltan puntuaciones:</strong> Para ver la comparativa completa, asegúrate de completar tanto la autoevaluación como la valoración del amigo.
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {selfCount < 10 && (
                <button
                  type="button"
                  onClick={onNavigateToSelf}
                  className="px-3 py-1.5 bg-white border border-amber-300 font-semibold text-amber-900 rounded-lg shadow-2xs hover:bg-amber-100"
                >
                  Completar Autoevaluación
                </button>
              )}
              {friendCount < 10 && (
                <button
                  type="button"
                  onClick={onNavigateToFriend}
                  className="px-3 py-1.5 bg-amber-700 font-semibold text-white rounded-lg shadow-2xs hover:bg-amber-800"
                >
                  Evaluar amigo
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Psychological Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: Puntos Ciegos Positivos */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Tus Virtudes Ocultas
            </span>
            <span className="text-xs font-bold bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-full">
              {positiveBlindSpots.length}
            </span>
          </div>

          <h3 className="font-bold text-stone-900 text-sm">
            Tu amigo te ve mucho mejor de lo que tú creías:
          </h3>

          <p className="text-xs text-stone-600">
            Cualidades donde te subestimaste pero tu amigo percibe un brillo mucho mayor:
          </p>

          <div className="space-y-2 pt-1">
            {positiveBlindSpots.length === 0 ? (
              <p className="text-xs text-stone-400 italic">
                Aún no hay rasgos con gran diferencia positiva.
              </p>
            ) : (
              positiveBlindSpots.slice(0, 4).map(item => (
                <div
                  key={item.adjective.id}
                  className="bg-white p-2.5 rounded-xl border border-emerald-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-stone-900">{item.adjective.word}</span>
                    <span className="text-[10px] text-stone-400 ml-1.5">
                      (Tú: {item.selfScore} &rarr; Amigo: {item.friendScore})
                    </span>
                  </div>
                  <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    +{item.diff} pts
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 2: Áreas de Crecimiento / Despertar */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Áreas de Mejora
            </span>
            <span className="text-xs font-bold bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full">
              {growthOpportunities.length}
            </span>
          </div>

          <h3 className="font-bold text-stone-900 text-sm">
            Rasgos para reflexionar y pulir:
          </h3>

          <p className="text-xs text-stone-600">
            Aquí es donde estabas equivocado sobre tu personalidad o tienes oportunidad de crecer:
          </p>

          <div className="space-y-2 pt-1">
            {growthOpportunities.length === 0 ? (
              <p className="text-xs text-stone-400 italic">
                No hay grandes discrepancias de mejora detectadas.
              </p>
            ) : (
              growthOpportunities.slice(0, 4).map(item => (
                <div
                  key={item.adjective.id}
                  className="bg-white p-2.5 rounded-xl border border-amber-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-stone-900">{item.adjective.word}</span>
                    <span className="text-[10px] text-stone-400 ml-1.5">
                      (Tú: {item.selfScore} &rarr; Amigo: {item.friendScore})
                    </span>
                  </div>
                  <span className={`font-extrabold px-2 py-0.5 rounded-md ${
                    item.diff > 0 
                      ? 'text-amber-800 bg-amber-100' 
                      : 'text-rose-700 bg-rose-100'
                  }`}>
                    {item.diff > 0 ? `+${item.diff}` : `${item.diff}`} pts
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 3: Fortalezas Compartidas */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              Sintonía Total
            </span>
            <span className="text-xs font-bold bg-blue-200/70 text-blue-900 px-2 py-0.5 rounded-full">
              {sharedStrengths.length}
            </span>
          </div>

          <h3 className="font-bold text-stone-900 text-sm">
            Ambos coinciden en tus pilares:
          </h3>

          <p className="text-xs text-stone-600">
            Valores y destrezas donde tanto tú como tu amigo os veis alineados con notas altas:
          </p>

          <div className="space-y-2 pt-1">
            {sharedStrengths.length === 0 ? (
              <p className="text-xs text-stone-400 italic">
                Aún no hay coincidencias altas.
              </p>
            ) : (
              sharedStrengths.slice(0, 4).map(item => (
                <div
                  key={item.adjective.id}
                  className="bg-white p-2.5 rounded-xl border border-blue-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-stone-900">{item.adjective.word}</span>
                  </div>
                  <div className="flex items-center gap-1 font-bold text-blue-700">
                    <span className="text-stone-500 font-normal">X: {item.selfScore}</span>
                    <span>·</span>
                    <span>Y: {item.friendScore}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Side-by-Side Complete Comparison Table */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div>
            <h3 className="font-bold text-stone-900 text-base font-display">
              Tabla Comparativa Completa (50 Adjetivos)
            </h3>
            <p className="text-xs text-stone-500">
              Explora cada rasgo individual, la nota dada por ti (X) y por tu amigo (Y).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar rasgo..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg"
              />
            </div>

            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as any)}
              className="text-xs py-1.5 px-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-700 font-medium"
            >
              <option value="all">Todos los rasgos</option>
              <option value="growth">Áreas de mejora</option>
              <option value="positive_blind">Virtudes ocultas (+)</option>
              <option value="aligned">Coincidencias exactas</option>
            </select>
          </div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-stone-100">
          {filteredRows.map(row => {
            return (
              <div
                key={row.adjective.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-stone-50/70 px-2 rounded-xl transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-900 text-sm">
                      {row.adjective.word}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      Col {row.adjective.column}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 line-clamp-1">
                    {row.adjective.definition}
                  </p>
                </div>

                {/* Score meters comparison */}
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-1 xs:pt-0 border-t xs:border-t-0 border-stone-100">
                  {/* Self Score */}
                  <div className="text-center w-14 sm:w-16">
                    <span className="text-[10px] text-stone-400 block uppercase font-bold">Auto</span>
                    <span className="font-extrabold text-sm text-stone-800">
                      {row.selfScore}
                    </span>
                  </div>

                  {/* Friend Score */}
                  <div className="text-center w-14 sm:w-16">
                    <span className="text-[10px] text-stone-400 block uppercase font-bold">Amigo</span>
                    <span className="font-extrabold text-sm text-amber-700">
                      {row.friendScore}
                    </span>
                  </div>

                  {/* Difference Badge */}
                  <div className="w-16 sm:w-20 text-right">
                    <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-black shadow-2xs ${
                      row.diff > 0 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : row.diff < 0 
                          ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                          : 'bg-stone-100 text-stone-600 border border-stone-200'
                    }`}>
                      {row.diff > 0 ? `+${row.diff}` : row.diff === 0 ? '=' : `${row.diff}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
