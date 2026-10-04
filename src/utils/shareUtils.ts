import { ScoreRecord, EvaluationSession, ComparisonDiff } from '../types';
import { ADJECTIVES } from '../data/adjectives';

export function encodeSessionToUrl(session: EvaluationSession): string {
  try {
    const compactScores: Record<number, number> = {};
    Object.entries(session.scores).forEach(([k, v]) => {
      compactScores[Number(k)] = v;
    });

    const payload = {
      x: session.targetPersonName,
      y: session.evaluatorName,
      s: session.isSelfEvaluation ? 1 : 0,
      a: session.isAnonymous ? 1 : 0,
      d: session.createdAt,
      v: compactScores,
    };

    const str = JSON.stringify(payload);
    const b64 = btoa(encodeURIComponent(str));
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('data', b64);
    return url.toString();
  } catch (e) {
    console.error('Failed to encode session', e);
    return window.location.href;
  }
}

export function decodeSessionFromUrl(): Partial<EvaluationSession> | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const b64 = params.get('data');
    if (!b64) return null;

    const str = decodeURIComponent(atob(b64));
    const payload = JSON.parse(str);

    return {
      targetPersonName: payload.x || '',
      evaluatorName: payload.y || '',
      isSelfEvaluation: payload.s === 1,
      isAnonymous: payload.a === 1,
      createdAt: payload.d || new Date().toISOString(),
      scores: payload.v || {},
    };
  } catch (e) {
    console.error('Failed to decode session from URL', e);
    return null;
  }
}

export function calculateComparison(selfScores: ScoreRecord, friendScores: ScoreRecord): ComparisonDiff[] {
  return ADJECTIVES.map(adj => {
    const s = selfScores[adj.id] ?? 5;
    const f = friendScores[adj.id] ?? 5;
    const diff = f - s;

    let type: ComparisonDiff['type'] = 'aligned_high';
    if (diff >= 3) {
      type = 'blind_spot_positive'; // Friend sees you significantly better
    } else if (diff <= -3) {
      type = 'blind_spot_growth'; // Friend scores you noticeably lower than you think
    } else if (s >= 8 && f >= 8) {
      type = 'aligned_high'; // Strong mutual agreement
    } else if (s <= 4 && f <= 4) {
      type = 'aligned_low'; // Mutually recognized lower trait
    } else {
      type = 'divergent';
    }

    return {
      adjective: adj,
      selfScore: s,
      friendScore: f,
      diff,
      type,
    };
  });
}

export function generateWhatsAppMessage(options: {
  targetPerson: string;
  evaluator: string;
  scores: ScoreRecord;
  isSelf: boolean;
  isAnonymous?: boolean;
}): string {
  const topList = ADJECTIVES.map(adj => ({
    word: adj.word,
    score: options.scores[adj.id] ?? 5,
  }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(t => `• ${t.word}: ${t.score}/10`)
    .join('\n');

  if (options.isSelf) {
    return encodeURIComponent(
      `🎯 ¡Hola! He completado mi autoevaluación en el juego del "Espejo de Amigos".\n` +
      `Ahora te toca a ti puntuarme con total sinceridad del 1 al 10 en los mismos 50 adjetivos para ver cómo me ves realmente.\n\n` +
      `¡Descubre mis puntos ciegos y lo que puedo mejorar! Entra aquí:\n${window.location.origin}`
    );
  }

  if (options.isAnonymous) {
    return encodeURIComponent(
      `🤫 ¡Hola${options.targetPerson ? ' ' + options.targetPerson : ''}! Te han enviado una valoración sincera y 100% ANÓNIMA en el juego "El Espejo de Amigos".\n\n` +
      `Un amigo ha querido regalarte esta mirada honesta sobre tus 50 cualidades sin desvelar su identidad para que la sinceridad sea total.\n\n` +
      `Tus 5 cualidades más altas según esta valoración:\n${topList}\n\n` +
      `¡Revisa la imagen adjunta con las 50 notas para descubrir cómo te perciben de verdad y qué puntos puedes potenciar!`
    );
  }

  return encodeURIComponent(
    `🪞 ¡Hola ${options.targetPerson}! He completado tu valoración en el juego del "Espejo de Amigos".\n\n` +
    `Aquí tienes algunas de tus cualidades más altas según mi percepción sincera:\n${topList}\n\n` +
    `¡Te adjunto la imagen completa con las 50 puntuaciones para que la compares con tu autoevaluación y veas en qué coincidimos y qué puedes mejorar!`
  );
}
