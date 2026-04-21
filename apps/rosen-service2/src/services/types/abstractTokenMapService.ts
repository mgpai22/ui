import { TokenMap } from '@rosen-bridge/extended-tokens';
import { AbstractService } from '@rosen-bridge/service-manager';

export abstract class AbstractTokenMapService extends AbstractService {
  protected static instance: AbstractTokenMapService;

  static getInstance = (): AbstractTokenMapService => {
    return AbstractTokenMapService.instance;
  };

  abstract getTokenMap: () => TokenMap;
}
