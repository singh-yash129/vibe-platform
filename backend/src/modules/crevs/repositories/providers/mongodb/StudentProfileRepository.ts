import { IStudentProfile } from '../../interfaces/crevs.js';
import { MongoDatabase } from '#shared/database/providers/mongo/MongoDatabase.js';
import { injectable, inject } from 'inversify';
import { Collection, ObjectId, ClientSession } from 'mongodb';
import { GLOBAL_TYPES } from '#root/types.js';
import { InternalServerError } from 'routing-controllers';

const DEFAULT_PROFILE = {
  reputationScore: 0,
  decoysEncountered: 0,
  decoysCaught: 0,
  remediationSessions: 0,
  remediationPasses: 0,
};

@injectable()
export class StudentProfileRepository {
  private collection: Collection<IStudentProfile>;
  private initialized = false;

  constructor(
    @inject(GLOBAL_TYPES.Database)
    private readonly db: MongoDatabase,
  ) {}

  private async init(): Promise<void> {
    if (this.initialized) return;
    this.collection = await this.db.getCollection<IStudentProfile>(
      'crevs_student_profiles',
    );
    await this.collection.createIndex(
      { userId: 1 },
      { unique: true, name: 'crevs_profile_uid_unique', background: true },
    );
    this.initialized = true;
  }

  /**
   * Atomically upsert profile and increment reputation fields.
   * Using findOneAndUpdate with $inc avoids read-modify-write race conditions
   * when multiple sessions complete concurrently.
   */
  async incrementReputation(
    userId: string,
    points: number,
    session?: ClientSession,
  ): Promise<IStudentProfile> {
    await this.init();
    const result = await this.collection.findOneAndUpdate(
      { userId: { $in: [userId, new ObjectId(userId)] } },
      {
        $inc: { reputationScore: points, decoysCaught: 1, decoysEncountered: 1 },
        $set: { lastUpdatedAt: new Date() },
        $setOnInsert: {
          userId: new ObjectId(userId),
          remediationSessions: 0,
          remediationPasses: 0,
          ...DEFAULT_PROFILE,
        },
      },
      { upsert: true, returnDocument: 'after', session },
    );
    if (!result) throw new InternalServerError('Failed to update student profile');
    return result;
  }

  async incrementDecoyEncountered(
    userId: string,
    session?: ClientSession,
  ): Promise<void> {
    await this.init();
    await this.collection.findOneAndUpdate(
      { userId: { $in: [userId, new ObjectId(userId)] } },
      {
        $inc: { decoysEncountered: 1 },
        $set: { lastUpdatedAt: new Date() },
        $setOnInsert: {
          userId: new ObjectId(userId),
          ...DEFAULT_PROFILE,
        },
      },
      { upsert: true, session },
    );
  }

  async incrementRemediationSession(
    userId: string,
    passed: boolean,
    session?: ClientSession,
  ): Promise<void> {
    await this.init();
    await this.collection.findOneAndUpdate(
      { userId: { $in: [userId, new ObjectId(userId)] } },
      {
        $inc: {
          remediationSessions: 1,
          ...(passed ? { remediationPasses: 1 } : {}),
        },
        $set: { lastUpdatedAt: new Date() },
        $setOnInsert: {
          userId: new ObjectId(userId),
          ...DEFAULT_PROFILE,
        },
      },
      { upsert: true, session },
    );
  }

  async findByUser(
    userId: string,
    session?: ClientSession,
  ): Promise<IStudentProfile | null> {
    await this.init();
    return this.collection.findOne(
      { userId: { $in: [userId, new ObjectId(userId)] } },
      { session },
    );
  }

  /**
   * Leaderboard helper — top N students by reputation for a given course.
   * (Course-scoped leaderboard requires a join with challenges; keeping simple
   * global scope for MVP; extend with course filter when needed.)
   */
  async getTopStudents(limit = 20, session?: ClientSession): Promise<IStudentProfile[]> {
    await this.init();
    return this.collection
      .find({}, { session })
      .sort({ reputationScore: -1 })
      .limit(limit)
      .toArray();
  }
}
