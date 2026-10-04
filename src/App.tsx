import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { EvaluationForm } from './components/EvaluationForm';
import { ReviewAndRectifyModal } from './components/ReviewAndRectifyModal';
import { ResultCardModal } from './components/ResultCardModal';
import { GameExplanationModal } from './components/GameExplanationModal';
import { OriginalImageReferenceModal } from './components/OriginalImageReferenceModal';
import { InstallAppBanner } from './components/InstallAppBanner';
import { AnonymousSharedImageView } from './components/AnonymousSharedImageView';
import { ScoreRecord, EvaluationSession } from './types';
import { ADJECTIVES } from './data/adjectives';
import { generateEvaluationImage } from './utils/imageGenerator';
import { decodeSessionFromUrl } from './utils/shareUtils';

const STORAGE_KEY = 'espejo_amigos_v5';

export default function App() {
  const [targetPersonName, setTargetPersonName] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [friendScores, setFriendScores] = useState<ScoreRecord>({});

  // Anonymous shared token detection in URL (/s/:token or ?token=...)
  const [anonymousShareToken, setAnonymousShareToken] = useState<string | null>(() => {
    try {
      const pathname = window.location.pathname;
      const match = pathname.match(/^\/s\/([^/?#]+)/);
      if (match && match[1]) return match[1].trim();

      const params = new URLSearchParams(window.location.search);
      const t = params.get('token');
      if (t) return t.trim();
    } catch {
      // ignore
    }
    return null;
  });

  // Modals state
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isOriginalImageOpen, setIsOriginalImageOpen] = useState(false);
  const [isRectifyOpen, setIsRectifyOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Active session for image creation and review
  const activeSession: EvaluationSession = {
    id: 'current',
    targetPersonName: targetPersonName || 'Mi Amigo',
    targetEmail: targetEmail.trim() || undefined,
    evaluatorName: 'Amigo Anónimo (Secreto)',
    isSelfEvaluation: false,
    isAnonymous: true,
    scores: friendScores,
    createdAt: new Date().toISOString(),
  };

  // Reset app completely on initial mount/URL access
  useEffect(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }

    setTargetPersonName('');
    setTargetEmail('');
    setFriendScores({});
    setGeneratedImageUrl(null);
    setIsResultModalOpen(false);
    setIsRectifyOpen(false);
  }, []);

  // Handler for setting a score
  const handleSetScore = (id: number, score: number) => {
    setFriendScores((prev) => ({
      ...prev,
      [id]: score,
    }));
  };

  // Handler for full reset
  const handleResetScores = () => {
    setFriendScores({});
    setTargetPersonName('');
    setTargetEmail('');
    setGeneratedImageUrl(null);
    setIsResultModalOpen(false);
    setIsRectifyOpen(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('espejo_amigos_v1');
      localStorage.removeItem('espejo_amigos_v2');
      localStorage.removeItem('espejo_amigos_v3');
      localStorage.removeItem('espejo_amigos_v4');
      localStorage.removeItem('espejo_amigos_v5');
    } catch {
      // Ignore
    }
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  // Confirm rectification and trigger canvas image generation
  const handleConfirmAndGenerateImage = async () => {
    setIsRectifyOpen(false);
    setIsGenerating(true);

    try {
      // Pass the 50 scores
      const completeScores: ScoreRecord = {};
      ADJECTIVES.forEach(adj => {
        completeScores[adj.id] = friendScores[adj.id] ?? 5;
      });

      const url = await generateEvaluationImage({
        targetPerson: targetPersonName.trim() || 'Amigo/a',
        evaluator: 'Amigo Anónimo (Secreto)',
        scores: completeScores,
        isSelf: false,
        isAnonymous: true,
      });

      setGeneratedImageUrl(url);
      setIsResultModalOpen(true);
    } catch (err) {
      console.error('Error generating image', err);
      alert('Hubo un error al generar la imagen. Por favor, intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (anonymousShareToken) {
    return (
      <AnonymousSharedImageView
        token={anonymousShareToken}
        onGoHome={() => {
          window.history.pushState({}, '', '/');
          setAnonymousShareToken(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900">
      
      {/* Top Header */}
      <Header
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenOriginalImage={() => setIsOriginalImageOpen(true)}
        onReset={handleResetScores}
        hasData={Object.keys(friendScores).length > 0 || !!targetPersonName || !!targetEmail}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-3.5 sm:px-6 py-4 sm:py-6">
        
        {/* PWA Install Banner */}
        <InstallAppBanner />

        {/* Evaluation Assessment Form with 50 adjectives */}
        <EvaluationForm
          isSelf={false}
          targetPersonName={targetPersonName}
          setTargetPersonName={setTargetPersonName}
          targetEmail={targetEmail}
          setTargetEmail={setTargetEmail}
          scores={friendScores}
          onSetScore={handleSetScore}
          onOpenRectify={() => setIsRectifyOpen(true)}
          onResetScores={handleResetScores}
        />
      </main>

      {/* Subtle Footer */}
      <footer className="border-t border-stone-200/80 bg-stone-100/60 py-4 text-center text-xs text-stone-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Espejo de Amigos · Evaluación de Personalidad Positiva y Constructiva
          </span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsOriginalImageOpen(true)}
              className="hover:underline cursor-pointer"
            >
              50 Adjetivos Originales
            </button>
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="hover:underline cursor-pointer"
            >
              ¿Cómo funciona?
            </button>
          </div>
        </div>
      </footer>

      {/* MODALS */}

      {/* 1. Rectification Modal (Crucial step before image generation) */}
      <ReviewAndRectifyModal
        isOpen={isRectifyOpen}
        onClose={() => setIsRectifyOpen(false)}
        scores={friendScores}
        targetPersonName={targetPersonName}
        isSelf={false}
        onUpdateScore={handleSetScore}
        onConfirmAndGenerateImage={handleConfirmAndGenerateImage}
      />

      {/* 2. Result & Export Card Modal (100% Automated, Zero popups) */}
      <ResultCardModal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        imageUrl={generatedImageUrl}
        session={activeSession}
        onOpenRectify={() => {
          setIsResultModalOpen(false);
          setIsRectifyOpen(true);
        }}
        onResetAll={handleResetScores}
      />

      {/* 3. Game Explanation Modal */}
      <GameExplanationModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        onStartEvaluation={() => {
          setIsHelpOpen(false);
        }}
      />

      {/* 4. Original Image Reference Modal */}
      <OriginalImageReferenceModal
        isOpen={isOriginalImageOpen}
        onClose={() => setIsOriginalImageOpen(false)}
      />

      {/* Loading Overlay when generating image */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-stone-200 text-center space-y-3 max-w-xs">
            <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="font-bold text-stone-900 text-sm">
              Generando imagen en alta resolución...
            </div>
            <div className="text-xs text-stone-500">
              Dibujando columnas, notas y análisis final.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
