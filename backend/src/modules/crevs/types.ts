/**
 * CREVS — Contextual Remediation & Evaluative Verification System
 * Dependency-injection symbols for the CREVS module.
 */
const TYPES = {
  // Controllers
  CrevsController: Symbol.for('CrevsController'),

  // Services
  CrevsService: Symbol.for('CrevsService'),

  // Repositories
  TelemetryMapRepo: Symbol.for('TelemetryMapRepo'),
  RemediationSessionRepo: Symbol.for('RemediationSessionRepo'),
  DecoyNoteRepo: Symbol.for('DecoyNoteRepo'),
  DecoyChallengeRepo: Symbol.for('DecoyChallengeRepo'),
  StudentProfileRepo: Symbol.for('StudentProfileRepo'),
};

export { TYPES as CREVS_TYPES };
