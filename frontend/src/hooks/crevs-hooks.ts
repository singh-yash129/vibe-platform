/**
 * crevs-hooks.ts
 * TanStack Query data-fetching hooks for all CREVS API endpoints.
 * Follows the exact same pattern as use-emotion.ts.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// ─── Response shape helpers ───────────────────────────────────────────────────

interface CrevsApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

function unwrap<T>(response: CrevsApiResponse<T>, fallbackMsg: string): T {
  if (!response.success || response.data === undefined) {
    throw new Error(response.message || fallbackMsg);
  }
  return response.data;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TelemetryPoint {
  transcriptTimestamp: number;
  matchScore: number;
  conceptText: string;
}

export interface RemediationStartResult {
  sessionId: string;
  loopStart: number;
  loopEnd: number;
  note: {
    noteId: string;
    bullets: string[];
    isDecoy: false;
  };
}

export interface ChallengeResult {
  isDecoyCaught: boolean;
  reputationGranted: number;
  newReputationScore: number;
  feedback: string;
}

export interface StudentProfile {
  reputationScore: number;
  decoysEncountered: number;
  decoysCaught: number;
  remediationSessions: number;
  remediationPasses: number;
}

export interface HeatmapBucket {
  timestampBucket: number;
  totalChallenges: number;
  decoyCaughtCount: number;
  decoyMissedCount: number;
  catchRate: number;
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

export interface TranscriptChunk {
  text: string;
  timestamp: [number, number | null];
}

async function mapTelemetry(payload: {
  questionId: string;
  questionText: string;
  videoItemId: string;
  transcriptChunks: TranscriptChunk[];
}): Promise<TelemetryPoint> {
  const res = await apiClient.post<CrevsApiResponse<TelemetryPoint>>(
    '/crevs/telemetry/map',
    payload,
  );
  return unwrap(res.data, 'Failed to map telemetry');
}

export function useMapTelemetry() {
  return useMutation({ mutationFn: mapTelemetry });
}

async function getTelemetry(
  questionId: string,
  videoItemId: string,
): Promise<TelemetryPoint | null> {
  const res = await apiClient.get<CrevsApiResponse<TelemetryPoint | null>>(
    `/crevs/telemetry/${questionId}`,
    { params: { videoItemId } },
  );
  return unwrap(res.data, 'Failed to fetch telemetry');
}

export function useTelemetry(questionId: string, videoItemId: string) {
  return useQuery({
    queryKey: ['crevs', 'telemetry', questionId, videoItemId],
    queryFn: () => getTelemetry(questionId, videoItemId),
    enabled: !!questionId && !!videoItemId,
    staleTime: Infinity, // Telemetry timestamps don't change per session
  });
}

// ─── Remediation ──────────────────────────────────────────────────────────────

async function startRemediation(payload: {
  questionId: string;
  videoItemId: string;
  segmentTranscript: string;
}): Promise<RemediationStartResult> {
  const res = await apiClient.post<CrevsApiResponse<RemediationStartResult>>(
    '/crevs/remediation/start',
    payload,
  );
  return unwrap(res.data, 'Failed to start remediation session');
}

export function useStartRemediation() {
  return useMutation({ mutationFn: startRemediation });
}

async function getDecoyNote(noteId: string): Promise<{ noteId: string; bullets: string[] }> {
  const res = await apiClient.get<CrevsApiResponse<{ noteId: string; bullets: string[] }>>(
    `/crevs/remediation/note/${noteId}`,
  );
  return unwrap(res.data, 'Failed to fetch decoy note');
}

export function useDecoyNote(noteId: string | null) {
  return useQuery({
    queryKey: ['crevs', 'decoyNote', noteId],
    queryFn: () => getDecoyNote(noteId!),
    enabled: !!noteId,
  });
}

// ─── Challenge ────────────────────────────────────────────────────────────────

async function submitChallenge(payload: {
  sessionId: string;
  noteId: string;
  courseId: string;
  videoItemId: string;
  studentCorrection: string;
}): Promise<ChallengeResult> {
  const res = await apiClient.post<CrevsApiResponse<ChallengeResult>>(
    '/crevs/challenge',
    payload,
  );
  return unwrap(res.data, 'Failed to submit challenge');
}

export function useSubmitChallenge() {
  return useMutation({ mutationFn: submitChallenge });
}

// ─── Student Profile ──────────────────────────────────────────────────────────

async function getStudentProfile(): Promise<StudentProfile> {
  const res = await apiClient.get<CrevsApiResponse<StudentProfile>>(
    '/crevs/student/profile',
  );
  return unwrap(res.data, 'Failed to fetch student profile');
}

export function useStudentProfile() {
  return useQuery({
    queryKey: ['crevs', 'studentProfile'],
    queryFn: getStudentProfile,
  });
}

// ─── Admin Heatmap ────────────────────────────────────────────────────────────

async function getHeatmap(courseId: string): Promise<HeatmapBucket[]> {
  const res = await apiClient.get<CrevsApiResponse<HeatmapBucket[]>>(
    `/crevs/admin/heatmap/${courseId}`,
  );
  return unwrap(res.data, 'Failed to fetch heatmap');
}

export function useHeatmap(courseId: string) {
  return useQuery({
    queryKey: ['crevs', 'heatmap', courseId],
    queryFn: () => getHeatmap(courseId),
    enabled: !!courseId,
  });
}
