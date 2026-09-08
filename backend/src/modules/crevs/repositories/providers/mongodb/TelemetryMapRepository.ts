import { ITelemetryMap } from '../../interfaces/crevs.js';
import { MongoDatabase } from '#shared/database/providers/mongo/MongoDatabase.js';
import { injectable, inject } from 'inversify';
import { Collection, ObjectId, ClientSession } from 'mongodb';
import { GLOBAL_TYPES } from '#root/types.js';
import { InternalServerError } from 'routing-controllers';

@injectable()
export class TelemetryMapRepository {
  private collection: Collection<ITelemetryMap>;
  private initialized = false;

  constructor(
    @inject(GLOBAL_TYPES.Database)
    private readonly db: MongoDatabase,
  ) {}

  private async init(): Promise<void> {
    if (this.initialized) return;
    this.collection = await this.db.getCollection<ITelemetryMap>(
      'crevs_telemetry_map',
    );
    // Compound unique index: one mapping per question per video item
    await this.collection.createIndex(
      { questionId: 1, videoItemId: 1 },
      { unique: true, name: 'crevs_telemetry_qid_vid', background: true },
    );
    await this.collection.createIndex(
      { videoItemId: 1, transcriptTimestamp: 1 },
      { name: 'crevs_telemetry_vid_ts', background: true },
    );
    this.initialized = true;
  }

  /**
   * Upsert a telemetry mapping so re-processing a job idempotently updates the
   * timestamp rather than duplicating the entry.
   */
  async upsert(
    data: Omit<ITelemetryMap, '_id'>,
    session?: ClientSession,
  ): Promise<string> {
    await this.init();
    const now = new Date();
    const result = await this.collection.findOneAndUpdate(
      {
        questionId: new ObjectId(data.questionId as string),
        videoItemId: new ObjectId(data.videoItemId as string),
      },
      {
        $set: {
          transcriptTimestamp: data.transcriptTimestamp,
          conceptText: data.conceptText,
          matchScore: data.matchScore,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: 'after', session },
    );
    if (!result) throw new InternalServerError('Failed to upsert telemetry map');
    return result._id!.toString();
  }

  /**
   * Find the telemetry mapping for a single question, optionally scoped to a
   * specific video item.
   */
  async findByQuestion(
    questionId: string,
    videoItemId?: string,
    session?: ClientSession,
  ): Promise<ITelemetryMap | null> {
    await this.init();
    const filter: Record<string, unknown> = {
      questionId: { $in: [questionId, new ObjectId(questionId)] },
    };
    if (videoItemId) {
      filter['videoItemId'] = { $in: [videoItemId, new ObjectId(videoItemId)] };
    }
    return this.collection.findOne(filter, { session });
  }

  /**
   * Bulk-fetch all mappings for a given video item, ordered by timestamp —
   * used to build the professor heatmap.
   */
  async findByVideoItem(
    videoItemId: string,
    session?: ClientSession,
  ): Promise<ITelemetryMap[]> {
    await this.init();
    return this.collection
      .find(
        { videoItemId: { $in: [videoItemId, new ObjectId(videoItemId)] } },
        { session },
      )
      .sort({ transcriptTimestamp: 1 })
      .toArray();
  }
}
