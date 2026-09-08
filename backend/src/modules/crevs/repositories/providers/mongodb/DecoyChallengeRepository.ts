import { IDecoyChallenge } from '../../interfaces/crevs.js';
import { MongoDatabase } from '#shared/database/providers/mongo/MongoDatabase.js';
import { injectable, inject } from 'inversify';
import { Collection, ObjectId, ClientSession } from 'mongodb';
import { GLOBAL_TYPES } from '#root/types.js';
import { InternalServerError } from 'routing-controllers';

@injectable()
export class DecoyChallengeRepository {
  private collection: Collection<IDecoyChallenge>;
  private initialized = false;

  constructor(
    @inject(GLOBAL_TYPES.Database)
    private readonly db: MongoDatabase,
  ) {}

  private async init(): Promise<void> {
    if (this.initialized) return;
    this.collection = await this.db.getCollection<IDecoyChallenge>(
      'crevs_decoy_challenges',
    );
    // Prevent a student from submitting multiple challenges for the same note
    await this.collection.createIndex(
      { decoyNoteId: 1, userId: 1 },
      { unique: true, name: 'crevs_challenge_note_user_unique', background: true },
    );
    await this.collection.createIndex(
      { userId: 1, submittedAt: -1 },
      { name: 'crevs_challenge_uid_ts', background: true },
    );
    await this.collection.createIndex(
      { courseId: 1, videoItemId: 1, submittedAt: -1 },
      { name: 'crevs_challenge_course_vid_ts', background: true },
    );
    this.initialized = true;
  }

  async create(
    data: Omit<IDecoyChallenge, '_id'>,
    session?: ClientSession,
  ): Promise<string> {
    await this.init();
    const result = await this.collection.insertOne(
      data as IDecoyChallenge,
      { session },
    );
    if (!result.acknowledged || !result.insertedId) {
      throw new InternalServerError('Failed to create decoy challenge');
    }
    return result.insertedId.toString();
  }

  async existsByNoteAndUser(
    decoyNoteId: string,
    userId: string,
    session?: ClientSession,
  ): Promise<boolean> {
    await this.init();
    const count = await this.collection.countDocuments(
      {
        decoyNoteId: { $in: [decoyNoteId, new ObjectId(decoyNoteId)] },
        userId: { $in: [userId, new ObjectId(userId)] },
      },
      { session },
    );
    return count > 0;
  }

  /**
   * Aggregation for the professor heatmap.
   * Groups challenges by 30-second timestamp buckets using the telemetry timestamp
   * stored on the challenge's linked decoy note's remediation session.
   *
   * Pipeline:
   *   challenges → lookup remediationSession → lookup telemetryMap → group by bucket
   */
  async getHeatmapForCourse(
    courseId: string,
    session?: ClientSession,
  ): Promise<{
    timestampBucket: number;
    totalChallenges: number;
    decoyCaughtCount: number;
    decoyMissedCount: number;
    catchRate: number;
  }[]> {
    await this.init();
    const pipeline = [
      { $match: { courseId: { $in: [courseId, new ObjectId(courseId)] } } },
      {
        $lookup: {
          from: 'crevs_remediation_sessions',
          localField: 'remediationSessionId',
          foreignField: '_id',
          as: 'session',
        },
      },
      { $unwind: '$session' },
      {
        $lookup: {
          from: 'crevs_telemetry_map',
          localField: 'session.questionId',
          foreignField: 'questionId',
          as: 'telemetry',
        },
      },
      { $unwind: { path: '$telemetry', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          timestampBucket: {
            $multiply: [
              { $floor: { $divide: [{ $ifNull: ['$telemetry.transcriptTimestamp', 0] }, 30] } },
              30,
            ],
          },
        },
      },
      {
        $group: {
          _id: '$timestampBucket',
          totalChallenges: { $sum: 1 },
          decoyCaughtCount: { $sum: { $cond: ['$isDecoyCaught', 1, 0] } },
          decoyMissedCount: { $sum: { $cond: ['$isDecoyCaught', 0, 1] } },
        },
      },
      {
        $addFields: {
          timestampBucket: '$_id',
          catchRate: {
            $cond: [
              { $eq: ['$totalChallenges', 0] },
              0,
              { $divide: ['$decoyCaughtCount', '$totalChallenges'] },
            ],
          },
        },
      },
      { $sort: { timestampBucket: 1 } },
      { $project: { _id: 0 } },
    ];
    return this.collection.aggregate(pipeline, { session }).toArray() as any;
  }
}
