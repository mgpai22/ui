import * as Sentry from '@sentry/nextjs';

import { dataSource } from './dataSource';

if (!dataSource.isInitialized) {
  try {
    await dataSource.initialize();
    await dataSource.runMigrations();
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag('layer', 'database');

      scope.setContext('datasource', {
        initialized: dataSource.isInitialized,
      });

      Sentry.captureException(error);
    });

    throw error;
  }
}
