import { BoxEntity } from '@rosen-bridge/address-extractor';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { LastSavedBlock } from '@rosen-bridge/scanner-sync-check';
import { AbstractService } from '@rosen-bridge/service-manager';

export abstract class AbstractDBService extends AbstractService {
  protected static instance: AbstractDBService;

  static getInstance = (): AbstractDBService => {
    return AbstractDBService.instance;
  };

  abstract getDataSource: () => DataSource;

  abstract getTokenMapBoxes: () => Promise<BoxEntity[]>;

  abstract getLastSavedBlock: (scanner: string) => Promise<LastSavedBlock>;
}
