import { PeriodicTaskService } from '@rosen-bridge/service-manager';

export abstract class AbstractGeneralMetricsService extends PeriodicTaskService {
  protected static instance: AbstractGeneralMetricsService;

  static getInstance = (): AbstractGeneralMetricsService => {
    return AbstractGeneralMetricsService.instance;
  };
}
