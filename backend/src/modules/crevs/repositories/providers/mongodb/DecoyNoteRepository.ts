import { IDecoyNote } from '../../interfaces/crevs.js';
import { MongoDatabase } from '#shared/database/providers/mongo/MongoDatabase.js';
import { injectable, inject } from 'inversify';
import { Collection, ObjectId, ClientSession } from 'mongodb';
import { GLOBAL_TYPES } from '#root/types.js';
import { InternalServerError } from 'routing-controllers';

@injectable()
export class DecoyNoteRepository {
  private collection: Collection<IDecoyNote>;
  private initialized = false;

  constructor(
    @inject(GLOBAL_TYPES.Database)
    private readonly db: MongoDatabase,
  ) {}

  private async init(): Promise<void> {
    if (this.initialized) return;
    this.collection = await this.db.getCollection<IDecoyNote>(
      'crevs_decoy_notes',
    );
    await this.collection.createIndex(
      { remediationSessionId: 1 },
      { unique: true, name: 'crevs_decoy_session_unique', background: true },
    );
    this.initialized = true;
  }

  async create(
    data: Omit<IDecoyNote, '_id'>,
    session?: ClientSession,
  ): Promise<string> {
    await this.init();
    const result = await this.collection.insertOne(data as IDecoyNote, {
      session,
    });
    if (!result.acknowledged || !result.insertedId) {
      throw new InternalServerError('Failed to create decoy note');
    }
    return result.insertedId.toString();
  }

  /**
   * Get a decoy note by its id, deliberately stripping sensitive fields
   * (`decoyErrorDescription`, `isDecoy`, `decoyBulletIndex`) before returning
   * to callers that will pass the data to the student.
   */
  async getPublicById(
    noteId: string,
    session?: ClientSession,
  ): Promise<Pick<IDecoyNote, '_id' | 'bullets'> | null> {
    await this.init();
    return this.collection.findOne(
      { _id: new ObjectId(noteId) },
      {
        projection: { bullets: 1 },
        session,
      },
    );
  }

  /** Full document — only for server-side validation. Never returned to client. */
  async getInternalById(
    noteId: string,
    session?: ClientSession,
  ): Promise<IDecoyNote | null> {
    await this.init();
    return this.collection.findOne(
      { _id: new ObjectId(noteId) },
      { session },
    );
  }

  async findBySession(
    remediationSessionId: string,
    session?: ClientSession,
  ): Promise<IDecoyNote | null> {
    await this.init();
    return this.collection.findOne(
      {
        remediationSessionId: {
          $in: [remediationSessionId, new ObjectId(remediationSessionId)],
        },
      },
      { session },
    );
  }
}
