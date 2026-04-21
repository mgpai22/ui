import { AbstractService } from '@rosen-bridge/service-manager';

export abstract class AbstractErgoExtractorsService extends AbstractService {
  protected static instance: AbstractErgoExtractorsService;

  static getInstance = (): AbstractErgoExtractorsService => {
    return AbstractErgoExtractorsService.instance;
  };
}
