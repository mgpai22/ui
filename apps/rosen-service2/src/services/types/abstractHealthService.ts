import { PeriodicTaskService } from '@rosen-bridge/service-manager';

export abstract class AbstractHealthService extends PeriodicTaskService {
  protected static instance: AbstractHealthService;

  static getInstance = (): AbstractHealthService => {
    return AbstractHealthService.instance;
  };
}
