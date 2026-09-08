import { ContainerModule } from 'inversify';
import { CREVS_TYPES } from './types.js';
import { CrevsController } from './controllers/CrevsController.js';
import { CrevsService } from './services/CrevsService.js';
import {
  TelemetryMapRepository,
  RemediationSessionRepository,
  DecoyNoteRepository,
  DecoyChallengeRepository,
  StudentProfileRepository,
} from './repositories/providers/mongodb/index.js';

export const crevsContainerModule = new ContainerModule(options => {
  // Repositories
  options
    .bind(CREVS_TYPES.TelemetryMapRepo)
    .to(TelemetryMapRepository)
    .inSingletonScope();
  options
    .bind(CREVS_TYPES.RemediationSessionRepo)
    .to(RemediationSessionRepository)
    .inSingletonScope();
  options
    .bind(CREVS_TYPES.DecoyNoteRepo)
    .to(DecoyNoteRepository)
    .inSingletonScope();
  options
    .bind(CREVS_TYPES.DecoyChallengeRepo)
    .to(DecoyChallengeRepository)
    .inSingletonScope();
  options
    .bind(CREVS_TYPES.StudentProfileRepo)
    .to(StudentProfileRepository)
    .inSingletonScope();

  // Services
  options
    .bind(CREVS_TYPES.CrevsService)
    .to(CrevsService)
    .inSingletonScope();

  // Controllers
  options.bind(CrevsController).toSelf().inSingletonScope();
});
