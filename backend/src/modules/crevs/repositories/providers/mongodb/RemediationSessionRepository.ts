import { IRemediationSession } from '../../interfaces/crevs.js';
import { MongoDatabase } from '#shared/database/providers/mongo/MongoDatabase.js';
import { injectable, inject } from 'inversify';
import { Collection, ObjectId, ClientSession } from 'mongodb';
import { GLOBAL_TYPES } from '#root/types.js';
import { InternalServerError } from 'routing-controllers';

@injectable()
export class RemediationSessionRepository {
  private collection: Collection<IRemediationSession>;
  private initialized = false;

  constructor(
    @inject(GLOBAL_TYPES.Database)
    private readonly db: MongoDatabase,
  ) {}

  private async init(): Promise<void> {
    if (this.initialized) return;
    this.collection = await this.db.getCollection<IRemediationSession>(
      'crevs_remediation_sessions',
    );
    await this.collection.createIndex(
      { userId: 1, questionId: 1 },
      { name: 'crevs_rem_uid_qid', background: true },
    );
    await this.collection.createIndex(
      { videoItemId: 1, attemptedAt: -1 },
      { name: 'crevs_rem_vid_ts', background: true },
    );
    this.initialized = true;
  }

  async create(
    data: Omit<IRemediationSession, '_id'>,
    session?: ClientSession,
  ): Promise<string> {
    await this.init();
    const result = await this.collection.insertOne(
      data as IRemediationSession,
      { session },
    );
    if (!result.acknowledged || !result.insertedId) {
      throw new InternalServerError('Failed to create remediation session');
    }
    return result.insertedId.toString();
  }

  async getById(
    sessionId: string,
    session?: ClientSession,
  ): Promise<IRemediationSession | null> {
    await this.init();
    return this.collection.findOne(
      { _id: new ObjectId(sessionId) },
      { session },
    );
  }

  async markPassed(
    sessionId: string,
    session?: ClientSession,
  ): Promise<void> {
    await this.init();
    await this.collection.updateOne(
      { _id: new ObjectId(sessionId) },
      { $set: { passed: true, resolvedAt: new Date() } },
      { session },
    );
  }

  async setDecoyNote(
    sessionId: string,
    decoyNoteId: string,
    session?: ClientSession,
  ): Promise<void> {
    await this.init();
    await this.collection.updateOne(
      { _id: new ObjectId(sessionId) },
      { $set: { decoyNoteId: new ObjectId(decoyNoteId) } },
      { session },
    );
  }

  /**
   * Recent sessions for a student on a particular video — used by the frontend
   * to know if the loop was already cleared.
   */
  async findByUserAndQuestion(
    userId: string,
    questionId: string,
    session?: ClientSession,
  ): Promise<IRemediationSession[]> {
    await this.init();
    return this.collection
      .find(
        {
          userId: { $in: [userId, new ObjectId(userId)] },
          questionId: { $in: [questionId, new ObjectId(questionId)] },
        },
        { session },
      )
      .sort({ attemptedAt: -1 })
      .limit(5)
      .toArray();
  }
}
