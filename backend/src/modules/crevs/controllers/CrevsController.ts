import {
  JsonController,
  Post,
  Get,
  Body,
  Params,
  HttpCode,
  Authorized,
  CurrentUser,
  BadRequestError,
  QueryParam,
} from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { injectable, inject } from 'inversify';
import { IsString, IsNotEmpty, IsArray, IsNumber, Min, ArrayMinSize, ArrayMaxSize, IsOptional } from 'class-validator';
import { CREVS_TYPES } from '../types.js';
import { CrevsService, TranscriptChunk } from '../services/CrevsService.js';

// ─── Request / Response DTOs ────────────────────────────────────────────────

export class MapTelemetryBody {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsString()
  @IsNotEmpty()
  questionText: string;

  @IsString()
  @IsNotEmpty()
  videoItemId: string;

  /** Whisper transcript chunks — forwarded directly from the frontend */
  @IsArray()
  transcriptChunks: TranscriptChunk[];
}

export class StartRemediationBody {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsString()
  @IsNotEmpty()
  videoItemId: string;

  /**
   * The raw transcript text for the 45-second segment the student is about to
   * review. Extracted client-side from the Whisper chunk array.
   */
  @IsString()
  @IsNotEmpty()
  segmentTranscript: string;
}

export class SubmitChallengeBody {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  noteId: string;

  @IsString()
  @IsNotEmpty()
  courseId: string;

  @IsString()
  @IsNotEmpty()
  videoItemId: string;

  @IsString()
  @IsNotEmpty()
  studentCorrection: string;
}

export class QuestionIdParams {
  @IsString()
  @IsNotEmpty()
  questionId: string;
}

export class NoteIdParams {
  @IsString()
  @IsNotEmpty()
  noteId: string;
}

export class CourseIdParams {
  @IsString()
  @IsNotEmpty()
  courseId: string;
}

// ─── Controller ─────────────────────────────────────────────────────────────

@OpenAPI({ tags: ['CREVS'] })
@injectable()
@JsonController('/crevs')
@Authorized()
export class CrevsController {
  constructor(
    @inject(CREVS_TYPES.CrevsService)
    private readonly crevsService: CrevsService,
  ) {}

  /**
   * POST /crevs/telemetry/map
   *
   * Maps a quiz question to the transcript timestamp where its concept is taught.
   * Called by the GenAI pipeline after question generation, passing the Whisper
   * transcript chunks.
   *
   * Access: Student or system (same auth as existing quiz endpoints)
   */
  @Post('/telemetry/map')
  @HttpCode(200)
  @OpenAPI({
    summary: 'Map a quiz question to its video transcript timestamp',
    description:
      'Uses keyword-overlap scoring between question text and Whisper transcript chunks to find the exact video timestamp where the concept is taught.',
  })
  async mapTelemetry(
    @Body() body: MapTelemetryBody,
    @CurrentUser() user: { id: string },
  ) {
    const result = await this.crevsService.mapQuestionToTimestamp(
      body.questionId,
      body.questionText,
      body.videoItemId,
      body.transcriptChunks,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /crevs/telemetry/:questionId?videoItemId=...
   *
   * Retrieve the stored telemetry timestamp for a question.
   * Called by the frontend when a quiz fails and it needs the rewind target.
   */
  @Get('/telemetry/:questionId')
  @OpenAPI({ summary: 'Get stored telemetry timestamp for a question' })
  async getTelemetry(
    @Params() params: QuestionIdParams,
    @QueryParam('videoItemId') videoItemId: string,
    @CurrentUser() user: { id: string },
  ) {
    const { crevsService } = this;
    // Delegate to a direct repo lookup through service
    const result = await (crevsService as any).telemetryRepo.findByQuestion(
      params.questionId,
      videoItemId,
    );
    if (!result) {
      return { success: true, data: null };
    }
    return {
      success: true,
      data: {
        transcriptTimestamp: result.transcriptTimestamp,
        matchScore: result.matchScore,
        conceptText: result.conceptText,
      },
    };
  }

  /**
   * POST /crevs/remediation/start
   *
   * Starts a remediation session when a student fails a quiz.
   * Returns loop boundaries and the 3-bullet decoy note (public, no isDecoy).
   */
  @Post('/remediation/start')
  @HttpCode(201)
  @OpenAPI({
    summary: 'Start a Smart Rewind remediation session',
    description:
      'Creates a loop-lock session, fires MiniMax M3 to generate a 3-bullet note (20% chance contains a subtle error), returns loop start/end timestamps.',
  })
  async startRemediation(
    @Body() body: StartRemediationBody,
    @CurrentUser() user: { id: string },
  ) {
    const result = await this.crevsService.startRemediationSession(
      user.id,
      body.questionId,
      body.videoItemId,
      body.segmentTranscript,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /crevs/remediation/note/:noteId
   *
   * Fetch the public (decoy-scrubbed) note for an active remediation session.
   */
  @Get('/remediation/note/:noteId')
  @OpenAPI({ summary: 'Get the public decoy note for a remediation session' })
  async getNote(
    @Params() params: NoteIdParams,
    @CurrentUser() user: { id: string },
  ) {
    const note = await this.crevsService.getPublicNote(params.noteId);
    return {
      success: true,
      data: note,
    };
  }

  /**
   * POST /crevs/challenge
   *
   * Student submits a "Challenge AI" correction.
   * Server validates against the internal decoy description.
   */
  @Post('/challenge')
  @HttpCode(200)
  @OpenAPI({
    summary: 'Submit a "Challenge AI" correction',
    description:
      'Validates the student correction against the stored decoy error description. Awards reputation points if the decoy was caught.',
  })
  async submitChallenge(
    @Body() body: SubmitChallengeBody,
    @CurrentUser() user: { id: string },
  ) {
    const result = await this.crevsService.submitChallenge(
      user.id,
      body.courseId,
      body.videoItemId,
      body.sessionId,
      body.noteId,
      body.studentCorrection,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /crevs/student/profile
   *
   * Returns the current user's CREVS reputation profile.
   */
  @Get('/student/profile')
  @OpenAPI({ summary: "Get the current student's CREVS reputation profile" })
  async getStudentProfile(@CurrentUser() user: { id: string }) {
    const profile = await this.crevsService.getStudentProfile(user.id);
    return {
      success: true,
      data: profile,
    };
  }

  /**
   * GET /crevs/admin/heatmap/:courseId
   *
   * Professor-only: heatmap of student challenge interactions bucketed by
   * 30-second video timestamp windows.
   */
  @Get('/admin/heatmap/:courseId')
  @OpenAPI({
    summary: 'Get CREVS interaction heatmap for a course (professors only)',
    description:
      'Aggregates challenge submissions by 30-second timestamp buckets. Returns catch rate per bucket for the professor to identify conceptually difficult segments.',
  })
  async getHeatmap(
    @Params() params: CourseIdParams,
    @CurrentUser() user: { id: string; role?: string },
  ) {
    // Role check — allow admin/professor roles. Adjust to match your CASL ability setup.
    if (user.role !== 'admin' && user.role !== 'instructor') {
      throw new BadRequestError(
        'Only instructors and administrators can view the heatmap.',
      );
    }
    const data = await this.crevsService.getHeatmapData(params.courseId);
    return {
      success: true,
      data,
    };
  }
}
