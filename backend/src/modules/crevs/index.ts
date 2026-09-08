/**
 * CREVS Module — Contextual Remediation & Evaluative Verification System
 *
 * Exports the standard `{moduleName}ContainerModules`, `{moduleName}ModuleControllers`,
 * and `setup{ModuleName}Container` convention required by `loadModules.ts`.
 */
import { sharedContainerModule } from '#root/container.js';
import { InversifyAdapter } from '#root/inversify-adapter.js';
import { Container, ContainerModule } from 'inversify';
import { RoutingControllersOptions, useContainer } from 'routing-controllers';
import { crevsContainerModule } from './container.js';
import { CrevsController } from './controllers/CrevsController.js';
import { authContainerModule } from '../auth/container.js';
import { usersContainerModule } from '../users/container.js';
import { notificationsContainerModule } from '../notifications/container.js';

export const crevsContainerModules: ContainerModule[] = [
  crevsContainerModule,
  sharedContainerModule,
  authContainerModule,
  usersContainerModule,
  notificationsContainerModule,
];

export const crevsModuleControllers: Function[] = [CrevsController];

export const crevsModuleValidators: Function[] = [];

export async function setupCrevsContainer(): Promise<void> {
  const container = new Container();
  await container.load(...crevsContainerModules);
  const inversifyAdapter = new InversifyAdapter(container);
  useContainer(inversifyAdapter);
}

export const crevsModuleOptions: RoutingControllersOptions = {
  controllers: crevsModuleControllers,
  defaultErrorHandler: true,
  authorizationChecker: async () => true,
  validation: true,
};

// Re-export core types for cross-module use
export * from './interfaces/crevs.js';
export * from './types.js';
