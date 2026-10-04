export interface AdjectiveItem {
  id: number;
  word: string;
  originalText: string;
  column: 1 | 2 | 3;
  definition: string;
  category: 'social' | 'cognitiva' | 'emocional' | 'conductual';
  tone: 'positivo' | 'constructivo' | 'neutro';
}

export type ScoreRecord = Record<number, number>; // id -> score (1..10)

export interface EvaluationSession {
  id: string;
  targetPersonName: string; // Amigo X
  targetEmail?: string;     // Email del amigo a avisar
  evaluatorName: string;    // Amigo Y (o "Yo mismo" para autoevaluación)
  isSelfEvaluation: boolean;
  isAnonymous?: boolean;
  scores: ScoreRecord;
  createdAt: string;
  notes?: string;
}

export interface ComparisonDiff {
  adjective: AdjectiveItem;
  selfScore: number;
  friendScore: number;
  diff: number; // friend - self
  type: 'blind_spot_positive' | 'blind_spot_growth' | 'aligned_high' | 'aligned_low' | 'divergent';
}

export type ShareDuration = '10m' | '1h' | '24h' | '7d';
export type ShareDownloadLimit = 1 | 5 | 'unlimited';

export interface CreateShareResponse {
  success: boolean;
  token: string;
  shareUrl: string;
  expiresAt: number;
  maxDownloads: number | null;
  recipientEmail?: string | null;
  emailSent?: boolean;
  emailStatus?: string;
  emailError?: string;
  smtpConfigured?: boolean;
}

export interface SmtpConfigInfo {
  configured: boolean;
  host?: string;
  port?: number;
  user?: string;
  fromEmail?: string;
  service?: string;
}

export interface ShareMetadata {
  token: string;
  expiresAt: number;
  remainingSeconds: number;
  maxDownloads: number | null;
  downloadCount: number;
  remainingDownloads: number | null;
  isExpired: boolean;
  isLimitReached: boolean;
  fileSizeBytes: number;
  mimeType: string;
}
