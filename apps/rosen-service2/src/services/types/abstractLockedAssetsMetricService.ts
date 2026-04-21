import { PeriodicTaskService } from '@rosen-bridge/service-manager';

export abstract class AbstractLockedAssetsMetricService extends PeriodicTaskService {
  protected static instance: AbstractLockedAssetsMetricService;

  static getInstance = (): AbstractLockedAssetsMetricService => {
    return AbstractLockedAssetsMetricService.instance;
  };
}
