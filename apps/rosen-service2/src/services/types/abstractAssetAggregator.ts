import { PeriodicTaskService } from '@rosen-bridge/service-manager';

export abstract class AbstractAssetAggregator extends PeriodicTaskService {
  protected static instance: AbstractAssetAggregator;

  static getInstance = (): AbstractAssetAggregator => {
    return AbstractAssetAggregator.instance;
  };
}
