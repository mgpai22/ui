import { PeriodicTaskService } from '@rosen-bridge/service-manager';
import { Chains, ChainScannersType } from 'types';

export abstract class AbstractScannerService extends PeriodicTaskService {
  protected static instance: AbstractScannerService;

  static getInstance = (): AbstractScannerService => {
    return AbstractScannerService.instance;
  };
  abstract getScanner: (chain: keyof Chains) => ChainScannersType | undefined;
}
