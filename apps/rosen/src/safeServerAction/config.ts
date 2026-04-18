import { InsufficientAssetsError } from '@rosen-network/base/dist/handleUncoveredAssets';
import * as Sentry from '@sentry/nextjs';

import { createSafeAction } from '@/safeServerAction/safeServerAction';

export const { wrap, unwrap, unwrapFromObject } = createSafeAction({
  errors: {
    InsufficientAssetsError,
  },

  async onError(error, traceKey, args) {
    if (typeof window !== 'undefined') return;

    if (error instanceof InsufficientAssetsError) return;

    /**
     * Handle server-side action errors: ignore known business errors,
     * enrich unexpected ones with action metadata (trace key, args),
     * and report them to Sentry for debugging.
     */
    Sentry.withScope((scope) => {
      scope.setTag('layer', 'server-action');

      scope.setTag('action', traceKey);

      scope.setContext('safeAction', {
        traceKey,
        args: args,
      });

      scope.setLevel('error');

      Sentry.captureException(error);
    });
  },
});
