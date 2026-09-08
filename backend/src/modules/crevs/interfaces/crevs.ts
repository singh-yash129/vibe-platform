import { ObjectId } from 'mongodb';

// ─────────────────────────────────────────────────────────────────────────────
// Collection: crevs_telemetry_map
// Maps an AI-generated quiz question to the exact video timestamp where the
// underlying concept was first taught.
// ─────────────────────────────────────────────────────────────────────────────
export interface ITelemetryMap {
  _id?: string | ObjectId;
  /** FK → questions collection */
  questionId: string | ObjectId;
  /** FK → course items (video item) */
  videoItemId: string | ObjectId;
  /** The seconds offset in the video where the concept appears in transcript */
  transcriptTimestamp: number;
  /** The raw transcript text snippet that matched the question concept */
  conceptText: string;
  /** Confidence score of the keyword-overlap match (0-1) */
  matchScore: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Collection: crevs_remediation_sessions
// Tracks each time a student enters a Smart Rewind / Loop-Lock session.
// ─────────────────────────────────────────────────────────────────────────────
export interface IRemediationSession {
  _id?: string | ObjectId;
  userId: string | ObjectId;
  questionId: string | ObjectId;
  videoItemId: string | ObjectId;
  /** loopStart = transcriptTimestamp - 15s (clamped at 0) */
  loopStart: number;
  /** loopEnd = loopStart + 45s */
  loopEnd: number;
  /** Whether the student re-answered correctly after the loop */
  passed: boolean;
  /** If a decoy note was generated for this session */
  decoyNoteId?: string | ObjectId;
  attemptedAt: Date;
  resolvedAt?: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Collection: crevs_decoy_notes
// LLM-generated 3-bullet summaries of a 45-second remediation segment.
// 20% of the time, one bullet intentionally contains a logical error.
// ─────────────────────────────────────────────────────────────────────────────
export interface IDecoyNote {
  _id?: string | ObjectId;
  remediationSessionId: string | ObjectId;
  /** The 3-bullet summary bullets (shown to student) */
  bullets: string[];
  /** Whether a hallucinated error was injected */
  isDecoy: boolean;
  /** 0-indexed bullet that contains the injected error (if isDecoy) */
  decoyBulletIndex?: number;
  /**
   * Internal only — NOT exposed to the student.
   * The description of what is wrong, used to validate the student's challenge.
   */
  decoyErrorDescription?: string;
  /** Raw transcript segment fed to the LLM */
  segmentTranscript: string;
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Collection: crevs_decoy_challenges
// A student's "Challenge AI" submission claiming to have found the decoy error.
// ─────────────────────────────────────────────────────────────────────────────
export interface IDecoyChallenge {
  _id?: string | ObjectId;
  decoyNoteId: string | ObjectId;
  remediationSessionId: string | ObjectId;
  userId: string | ObjectId;
  courseId: string | ObjectId;
  videoItemId: string | ObjectId;
  /** The student's free-text correction/explanation */
  studentCorrection: string;
  /**
   * Server-side verdict: true when:
   *   - The note WAS a decoy AND the student's correction references the correct concept.
   * false when:
   *   - The note was NOT a decoy (student challenged a correct note), OR
   *   - The note was a decoy but the student identified the wrong thing.
   */
  isDecoyCaught: boolean;
  /** Reputation points granted for this challenge (0 if not caught) */
  reputationGranted: number;
  submittedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Collection: crevs_student_profiles
// Persistent reputation ledger per student.
// ─────────────────────────────────────────────────────────────────────────────
export interface IStudentProfile {
  _id?: string | ObjectId;
  /** Unique — one profile per user */
  userId: string | ObjectId;
  /** Cumulative reputation score across all courses */
  reputationScore: number;
  /** Total number of decoy notes encountered */
  decoysEncountered: number;
  /** Total number of decoy notes successfully caught */
  decoysCaught: number;
  /** Total remediation sessions entered */
  remediationSessions: number;
  /** Total remediation sessions that resulted in a pass */
  remediationPasses: number;
  lastUpdatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs / Response shapes
// ─────────────────────────────────────────────────────────────────────────────
export interface IDecoyNotePublic {
  noteId: string;
  bullets: string[];
  /** Always false in public response — the student must not know if it's a decoy */
  isDecoy: false;
}

export interface IChallengeResult {
  isDecoyCaught: boolean;
  reputationGranted: number;
  newReputationScore: number;
  feedback: string;
}

export interface IHeatmapBucket {
  /** Timestamp bucket start (seconds), bucketed in 30s windows */
  timestampBucket: number;
  totalChallenges: number;
  decoyCaughtCount: number;
  decoyMissedCount: number;
  /** 0–1 catch rate */
  catchRate: number;
}
