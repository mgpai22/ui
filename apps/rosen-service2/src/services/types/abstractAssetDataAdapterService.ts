import { PeriodicTaskService } from '@rosen-bridge/service-manager';
import { ChainsAdapters } from '@rosen-ui/asset-data-adapter';
import { TotalSupply } from 'types';

export abstract class AbstractAssetDataAdapterService extends PeriodicTaskService {
  protected static instance: AbstractAssetDataAdapterService;
  protected adapters: { [key: string]: ChainsAdapters } = {};

  static getInstance = (): AbstractAssetDataAdapterService => {
    return AbstractAssetDataAdapterService.instance;
  };

  abstract getAssetsTotalSupply: () => Promise<{
    [chain: string]: TotalSupply[];
  }>;
}
