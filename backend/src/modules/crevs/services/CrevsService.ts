import { injectable, inject } from 'inversify';
import { BadRequestError, InternalServerError, NotFoundError } from 'routing-controllers';
import { ObjectId } from 'mongodb';
import { CREVS_TYPES } from '../types.js';
import { GENAI_TYPES } from '#root/modules/genAI/types.js';
import { GLOBAL_TYPES } from '#root/types.js';
import { MongoDatabase } from '#root/shared/index.js';
import { BaseService } from '#root/shared/classes/BaseService.js';
import { screeningConfig } from '#root/config/screening.js';
import { TelemetryMapRepository } from '../repositories/providers/mongodb/TelemetryMapRepository.js';
import { RemediationSessionRepository } from '../repositories/providers/mongodb/RemediationSessionRepository.js';
import { DecoyNoteRepository } from '../repositories/providers/mongodb/DecoyNoteRepository.js';
import { DecoyChallengeRepository } from '../repositories/providers/mongodb/DecoyChallengeRepository.js';
import { StudentProfileRepository } from '../repositories/providers/mongodb/StudentProfileRepository.js';
import type {
  ITelemetryMap,
  IDecoyNotePublic,
  IChallengeResult,
  IHeatmapBucket,
} from '../interfaces/crevs.js';

/** Transcript chunk as produced by the Whisper worker. */
export interface TranscriptChunk {
  text: string;
  timestamp: [number, number | null];
}

/** LLM response structure for the remediation note. */
interface DecoyNoteRaw {
  bullets: [string, string, string];
  is_decoy: boolean;
  decoy_bullet_index?: number;
  decoy_error_description?: string;
}

/**
 * CREVS Core Service.
 *
 * Orchestrates:
 *  1. Telemetry mapping (question → video timestamp)
 *  2. Remediation session lifecycle
 *  3. Decoy note generation via MiniMax M3
 *  4. Challenge validation & reputation scoring
 *  5. Heatmap data retrieval
 */
@injectable()
export class CrevsService extends BaseService {
  /** Reputation points awarded for catching a real decoy */
  private static readonly DECOY_CATCH_POINTS = 50;
  /** Points awarded when a student correctly identifies a non-decoy as clean */
  private static readonly FALSE_ALARM_PENALTY = 0; // no penalty by design
  /** Probability (0-1) that the LLM injects a logical error */
  private static readonly DECOY_PROBABILITY = 0.2;
  /** Keyword-overlap score threshold below which we fall back to the first chunk */
  private static readonly MIN_MATCH_SCORE = 0.15;

  constructor(
    @inject(CREVS_TYPES.TelemetryMapRepo)
    private readonly telemetryRepo: TelemetryMapRepository,

    @inject(CREVS_TYPES.RemediationSessionRepo)
    private readonly remediationRepo: RemediationSessionRepository,

    @inject(CREVS_TYPES.DecoyNoteRepo)
    private readonly decoyNoteRepo: DecoyNoteRepository,

    @inject(CREVS_TYPES.DecoyChallengeRepo)
    private readonly decoyChallengeRepo: DecoyChallengeRepository,

    @inject(CREVS_TYPES.StudentProfileRepo)
    private readonly studentProfileRepo: StudentProfileRepository,

    @inject(GLOBAL_TYPES.Database)
    db: MongoDatabase,
  ) {
    super(db);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Feature 1: Telemetry Mapping
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Map an AI-generated question to the exact transcript timestamp where its
   * concept is taught, using TF-IDF-inspired keyword overlap scoring.
   *
   * Algorithm:
   *  1. Tokenise the question text into meaningful keywords (stop-word filtered)
   *  2. For each transcript chunk, compute Jaccard-like overlap with the keyword set
   *  3. Pick the chunk with the highest overlap score
   *  4. Fall back to the middle of the video if no chunk clears the threshold
   */
  async mapQuestionToTimestamp(
    questionId: string,
    questionText: string,
    videoItemId: string,
    transcriptChunks: TranscriptChunk[],
  ): Promise<{ transcriptTimestamp: number; matchScore: number; conceptText: string }> {
    const keywords = this.extractKeywords(questionText);
    let bestScore = 0;
    let bestChunk: TranscriptChunk | null = null;

    for (const chunk of transcriptChunks) {
      const score = this.computeOverlapScore(keywords, chunk.text);
      if (score > bestScore) {
        bestScore = score;
        bestChunk = chunk;
      }
    }

    const transcriptTimestamp =
      bestScore >= CrevsService.MIN_MATCH_SCORE && bestChunk
        ? (bestChunk.timestamp[0] ?? 0)
        : this.fallbackTimestamp(transcriptChunks);

    const conceptText = bestChunk?.text ?? '';

    await this.telemetryRepo.upsert({
      questionId: new ObjectId(questionId),
      videoItemId: new ObjectId(videoItemId),
      transcriptTimestamp,
      conceptText,
      matchScore: bestScore,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { transcriptTimestamp, matchScore: bestScore, conceptText };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Feature 2 & 3: Remediation Session + Decoy Note Generation
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Called when a student fails a smart-check quiz.
   *
   * 1. Looks up the telemetry timestamp for the failed question
   * 2. Creates a RemediationSession document
   * 3. Fires the LLM to generate the 3-bullet note (20% chance of decoy)
   * 4. Links the note to the session
   *
   * Returns the loop boundaries and public note for the frontend.
   */
  async startRemediationSession(
    userId: string,
    questionId: string,
    videoItemId: string,
    segmentTranscript: string,
  ): Promise<{
    sessionId: string;
    loopStart: number;
    loopEnd: number;
    note: IDecoyNotePublic;
  }> {
    return this._withTransaction(async session => {
      // 1. Find the timestamp
      const telemetry = await this.telemetryRepo.findByQuestion(
        questionId,
        videoItemId,
        session,
      );
      const anchorTs = telemetry?.transcriptTimestamp ?? 0;
      const loopStart = Math.max(0, anchorTs - 15);
      const loopEnd = loopStart + 45;

      // 2. Create remediation session
      const sessionId = await this.remediationRepo.create(
        {
          userId: new ObjectId(userId),
          questionId: new ObjectId(questionId),
          videoItemId: new ObjectId(videoItemId),
          loopStart,
          loopEnd,
          passed: false,
          attemptedAt: new Date(),
        },
        session,
      );

      // 3. Generate LLM decoy note
      const noteRaw = await this.generateDecoyNoteViaMinimax(
        segmentTranscript,
        CrevsService.DECOY_PROBABILITY,
      );

      // 4. Persist note
      const noteId = await this.decoyNoteRepo.create(
        {
          remediationSessionId: new ObjectId(sessionId),
          bullets: noteRaw.bullets,
          isDecoy: noteRaw.is_decoy,
          decoyBulletIndex: noteRaw.decoy_bullet_index,
          decoyErrorDescription: noteRaw.decoy_error_description,
          segmentTranscript,
          createdAt: new Date(),
        },
        session,
      );
      await this.remediationRepo.setDecoyNote(sessionId, noteId, session);

      // 5. Track profile stats
      if (noteRaw.is_decoy) {
        await this.studentProfileRepo.incrementDecoyEncountered(userId, session);
      }
      await this.studentProfileRepo.incrementRemediationSession(
        userId,
        false,
        session,
      );

      return {
        sessionId,
        loopStart,
        loopEnd,
        note: {
          noteId,
          bullets: noteRaw.bullets,
          isDecoy: false, // Never expose this to client
        },
      };
    });
  }

  /**
   * Get the public-safe decoy note for an ongoing remediation session.
   * Strips `isDecoy` and `decoyErrorDescription` — the student must not see those.
   */
  async getPublicNote(noteId: string): Promise<IDecoyNotePublic> {
    const doc = await this.decoyNoteRepo.getPublicById(noteId);
    if (!doc) throw new NotFoundError(`Decoy note ${noteId} not found`);
    return {
      noteId: doc._id!.toString(),
      bullets: doc.bullets,
      isDecoy: false,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Feature 4: Challenge Validation & Reputation
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Process a student's "Challenge AI" submission.
   *
   * Validation rules:
   *  - If the note WAS a decoy AND the student correction mentions a keyword
   *    from the `decoyErrorDescription`, they caught it → award points.
   *  - If the note was NOT a decoy, they challenged a correct summary → no points,
   *    but we still record the attempt for the heatmap.
   *  - A student may only challenge each note once.
   */
  async submitChallenge(
    userId: string,
    courseId: string,
    videoItemId: string,
    sessionId: string,
    noteId: string,
    studentCorrection: string,
  ): Promise<IChallengeResult> {
    return this._withTransaction(async session => {
      // Guard: one challenge per note per user
      const alreadySubmitted = await this.decoyChallengeRepo.existsByNoteAndUser(
        noteId,
        userId,
        session,
      );
      if (alreadySubmitted) {
        throw new BadRequestError('You have already challenged this note.');
      }

      const remSession = await this.remediationRepo.getById(sessionId, session);
      if (!remSession) throw new NotFoundError(`Remediation session ${sessionId} not found`);

      const note = await this.decoyNoteRepo.getInternalById(noteId, session);
      if (!note) throw new NotFoundError(`Note ${noteId} not found`);

      let isDecoyCaught = false;
      let reputationGranted = 0;
      let feedback: string;

      if (note.isDecoy) {
        // Does the student's correction reference the correct error concept?
        const correctionWords = this.extractKeywords(studentCorrection);
        const errorWords = this.extractKeywords(note.decoyErrorDescription ?? '');
        const overlap = this.computeOverlapScore(correctionWords, note.decoyErrorDescription ?? '');

        if (overlap >= 0.25 || errorWords.some(w => studentCorrection.toLowerCase().includes(w))) {
          isDecoyCaught = true;
          reputationGranted = CrevsService.DECOY_CATCH_POINTS;
          feedback =
            '🎯 Excellent critical thinking! You correctly identified the intentional error. Your reputation score has been updated.';
        } else {
          feedback =
            '🔍 You challenged the AI, but your correction did not match the actual error. The error was in a different concept. Keep thinking critically!';
        }
      } else {
        // Note was accurate — student challenged a correct summary
        feedback =
          '✅ The AI summary was actually correct this time. No points are awarded, but we appreciate your vigilance!';
      }

      // Persist challenge
      await this.decoyChallengeRepo.create(
        {
          decoyNoteId: new ObjectId(noteId),
          remediationSessionId: new ObjectId(sessionId),
          userId: new ObjectId(userId),
          courseId: new ObjectId(courseId),
          videoItemId: new ObjectId(videoItemId),
          studentCorrection,
          isDecoyCaught,
          reputationGranted,
          submittedAt: new Date(),
        },
        session,
      );

      // Grant reputation atomically
      let newProfile = null;
      if (isDecoyCaught && reputationGranted > 0) {
        newProfile = await this.studentProfileRepo.incrementReputation(
          userId,
          reputationGranted,
          session,
        );
        // Unlock the remediation session
        await this.remediationRepo.markPassed(sessionId, session);
        await this.studentProfileRepo.incrementRemediationSession(userId, true, session);
      }

      const currentProfile = newProfile ?? (await this.studentProfileRepo.findByUser(userId, session));

      return {
        isDecoyCaught,
        reputationGranted,
        newReputationScore: currentProfile?.reputationScore ?? 0,
        feedback,
      };
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Feature 5: Heatmap for Professors
  // ───────────────────────────────────────────────────────────────────────────

  async getHeatmapData(courseId: string): Promise<IHeatmapBucket[]> {
    return this.decoyChallengeRepo.getHeatmapForCourse(courseId) as any;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public: student profile
  // ───────────────────────────────────────────────────────────────────────────

  async getStudentProfile(userId: string) {
    const profile = await this.studentProfileRepo.findByUser(userId);
    if (!profile) {
      return {
        reputationScore: 0,
        decoysEncountered: 0,
        decoysCaught: 0,
        remediationSessions: 0,
        remediationPasses: 0,
      };
    }
    return profile;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private: LLM integration via MiniMax M3
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Calls the MiniMax M3 Chat Completions API (OpenAI-compatible) to generate a
   * 3-bullet remediation note from a 45-second transcript segment.
   *
   * The prompt instructs the model:
   *  - Produce exactly 3 concise bullet points summarising the segment
   *  - With probability `decoy_probability`, intentionally introduce ONE subtle
   *    logical error in one of the bullets (to test the student's recall)
   *  - Return a structured JSON object
   *
   * The model NEVER knows which attempt this is or who the student is.
   */
  private async generateDecoyNoteViaMinimax(
    segmentTranscript: string,
    decoyProbability: number,
  ): Promise<DecoyNoteRaw> {
    const { apiKey, url, model } = screeningConfig.minimax;
    if (!apiKey) {
      // Graceful degradation in dev/CI where no key is set
      console.warn('[CREVS] MINIMAX_API_KEY not set — returning stub note');
      return this.stubDecoyNote(decoyProbability);
    }

    const shouldInjectDecoy = Math.random() < decoyProbability;

    const systemPrompt = `You are an expert educational content analyst for an online learning platform. 
Your task is to generate a concise 3-bullet summary note of a lecture transcript segment.
${shouldInjectDecoy
  ? `⚠️ IMPORTANT: For this specific request, you MUST intentionally introduce ONE subtle but realistic logical error into exactly one of the three bullets. 
The error must be plausible — not obviously wrong — so a student reviewing the material will need to think critically to catch it.
The error should be a factual inversion, incorrect numerical value, or mistaken causal relationship related to the actual content.`
  : `The summary must be 100% accurate and faithful to the source material.`
}

You MUST respond with ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "bullets": ["bullet 1", "bullet 2", "bullet 3"],
  "is_decoy": ${shouldInjectDecoy},
  "decoy_bullet_index": ${shouldInjectDecoy ? '<0, 1, or 2 — the index of the bullet containing the error>' : 'null'},
  "decoy_error_description": ${shouldInjectDecoy ? '"<internal description of what the error is and what is correct — 1 sentence>"' : 'null'}
}`;

    const userPrompt = `Transcript segment (approximately 45 seconds of lecture):
---
${segmentTranscript.slice(0, 2000)}
---

Generate the 3-bullet summary note now.`;

    const body = JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: shouldInjectDecoy ? 0.7 : 0.3,
      max_tokens: 512,
    });

    let lastErr: unknown;
    let backoff = 800;
    const maxRetries = 3;
    const timeoutMs = 15_000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body,
          signal: controller.signal,
        });

        if (res.status === 429 || res.status >= 500) {
          throw new Error(`MiniMax transient ${res.status}`);
        }
        if (!res.ok) {
          const errText = (await res.text()).slice(0, 300);
          throw new InternalServerError(`MiniMax error ${res.status}: ${errText}`);
        }

        const json = (await res.json()) as any;
        const content: string = json?.choices?.[0]?.message?.content ?? '';
        const parsed = this.parseDecoyNoteJson(content, shouldInjectDecoy);
        return parsed;
      } catch (err) {
        lastErr = err;
        const isAbort = (err as Error)?.name === 'AbortError';
        const isRetriable =
          isAbort || (err instanceof Error && err.message.startsWith('MiniMax transient'));
        if (attempt === maxRetries || !isRetriable) break;
        await new Promise(r => setTimeout(r, backoff));
        backoff = Math.min(backoff + 800, 4000);
      } finally {
        clearTimeout(timer);
      }
    }

    // On LLM failure, fall back to a safe non-decoy stub so learning is not blocked
    console.error('[CREVS] MiniMax call failed, using stub note:', lastErr);
    return this.stubDecoyNote(0); // always safe on failure
  }

  /** Parse and validate the LLM JSON output, with defensive fallbacks. */
  private parseDecoyNoteJson(content: string, expectedDecoy: boolean): DecoyNoteRaw {
    try {
      // Strip possible markdown fences
      const cleaned = content
        .replace(/^```(?:json)?\s*/m, '')
        .replace(/\s*```$/m, '')
        .trim();
      const obj = JSON.parse(cleaned) as any;

      if (!Array.isArray(obj.bullets) || obj.bullets.length < 3) {
        throw new Error('Invalid bullets array');
      }

      return {
        bullets: [
          String(obj.bullets[0]),
          String(obj.bullets[1]),
          String(obj.bullets[2]),
        ],
        is_decoy: Boolean(obj.is_decoy ?? expectedDecoy),
        decoy_bullet_index:
          obj.decoy_bullet_index != null ? Number(obj.decoy_bullet_index) : undefined,
        decoy_error_description: obj.decoy_error_description
          ? String(obj.decoy_error_description)
          : undefined,
      };
    } catch {
      return this.stubDecoyNote(0);
    }
  }

  /** Safe fallback when LLM is unavailable or returns unparseable output. */
  private stubDecoyNote(decoyProbability: number): DecoyNoteRaw {
    const isDecoy = Math.random() < decoyProbability;
    return {
      bullets: [
        'The lecture covered key foundational concepts in this topic.',
        'Several examples were provided to illustrate the main ideas.',
        'Review the supporting material to reinforce your understanding.',
      ],
      is_decoy: isDecoy,
      decoy_bullet_index: undefined,
      decoy_error_description: undefined,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private: NLP helpers (zero-dependency, runs in Node.js)
  // ───────────────────────────────────────────────────────────────────────────

  private static readonly STOP_WORDS = new Set([
    'a','an','the','and','or','but','in','on','at','to','for','of','with',
    'is','are','was','were','be','been','being','have','has','had','do',
    'does','did','will','would','could','should','may','might','shall',
    'that','this','these','those','it','its','by','from','as','if','then',
    'than','so','not','no','nor','yet','both','either','neither','each',
    'few','more','most','other','some','such','into','through','during',
    'before','after','above','below','between','out','off','over','under',
    'again','further','here','there','when','where','why','how','all','any',
    'can','what','which','who','whom','very','just','because','about',
  ]);

  /** Tokenise text into lowercase alphabetic tokens, filtered for significance. */
  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !CrevsService.STOP_WORDS.has(w));
  }

  /**
   * Jaccard-inspired overlap: |intersection| / |union| between keyword set and
   * the token set of the candidate text.
   */
  private computeOverlapScore(keywords: string[], text: string): number {
    if (!keywords.length) return 0;
    const textTokens = new Set(this.extractKeywords(text));
    const intersection = keywords.filter(k => textTokens.has(k)).length;
    const union = new Set([...keywords, ...Array.from(textTokens)]).size;
    return union === 0 ? 0 : intersection / union;
  }

  /** If no chunk scores above threshold, use the midpoint of the transcript. */
  private fallbackTimestamp(chunks: TranscriptChunk[]): number {
    if (!chunks.length) return 0;
    const midIndex = Math.floor(chunks.length / 2);
    return chunks[midIndex].timestamp[0] ?? 0;
  }
}
