import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { ErgoObservationExtractor } from '@rosen-bridge/ergo-observation-extractor';
import { ErgoScanner } from '@rosen-bridge/ergo-scanner';
import {
  Dependency,
  ServiceAction,
  ServiceStatus,
} from '@rosen-bridge/service-manager';
import { NETWORKS } from '@rosen-ui/constants';
import 'constants';
import { createEventTrigger } from 'scanners/ergo';
import { resolveErgoNetworkConfig } from 'utils';

import { configs } from '../configs';
import { AbstractErgoExtractorsService } from './types/abstractErgoExtractor';
import { AbstractErgoScannerService } from './types/abstractErgoScanner';
import { AbstractTokenMapService } from './types/abstractTokenMapService';
import { AbstractDBService } from './types/abstrctDb';

export class ErgoExtractorService extends AbstractErgoExtractorsService {
  private ergoScanner: ErgoScanner;
  name = 'ErgoExtractorService';
  protected dependencies: Dependency[] = [
    {
      serviceName: AbstractDBService.getInstance().getName(),
      allowedStatuses: [ServiceStatus.running],
      action: ServiceAction.start,
    },
    {
      serviceName: AbstractTokenMapService.getInstance().getName(),
      allowedStatuses: [ServiceStatus.running],
      action: ServiceAction.assemble,
    },
    {
      serviceName: AbstractErgoScannerService.getInstance().getName(),
      allowedStatuses: [ServiceStatus.running],
      action: ServiceAction.assemble,
    },
  ];

  assemble = async (): Promise<boolean> => {
    this.setStatus(ServiceStatus.dormant);
    this.ergoScanner =
      AbstractErgoScannerService.getInstance().getErgoScanner();
    return true;
  };

  /**
   * Stops the service by removing all registered extractors from the ErgoScanner.
   * @returns {Promise<boolean>} True if the service stopped successfully.
   */
  protected stop = async (): Promise<boolean> => {
    this.ergoScanner.extractors.map((extractors) => {
      this.ergoScanner.removeExtractor(extractors);
    });
    this.setStatus(ServiceStatus.dormant);
    return true;
  };

  /**
   * Starts the service by initializing extractors for supported chains
   * and registering them with the  ErgoScanner.
   * @returns {Promise<boolean>} True if the service started successfully, false otherwise.
   */
  protected start = async (): Promise<boolean> => {
    this.setStatus(ServiceStatus.started);
    const { networkType, url } = resolveErgoNetworkConfig();
    try {
      const ergoObservationExtractor = new ErgoObservationExtractor(
        configs.contracts.ergo.addresses.lock,
        AbstractDBService.getInstance().getDataSource(),
        AbstractTokenMapService.getInstance().getTokenMap(),
        this.logger.child('ergoObservationExtractor'),
      );
      await this.ergoScanner.registerExtractor(ergoObservationExtractor);
      const ergoEventTriggerExtractor = createEventTrigger(
        NETWORKS.ergo.key,
        networkType,
        url,
        AbstractDBService.getInstance().getDataSource(),
        configs.contracts.ergo,
      );
      await this.ergoScanner.registerExtractor(ergoEventTriggerExtractor);
      if (configs.chains.cardano.active)
        await this.ergoScanner.registerExtractor(
          createEventTrigger(
            NETWORKS.cardano.key,
            networkType,
            url,
            AbstractDBService.getInstance().getDataSource(),
            configs.contracts.cardano,
          ),
        );
      if (configs.chains.bitcoin.active)
        await this.ergoScanner.registerExtractor(
          createEventTrigger(
            NETWORKS.binance.key,
            networkType,
            url,
            AbstractDBService.getInstance().getDataSource(),
            configs.contracts.bitcoin,
          ),
        );
      if (configs.chains.doge.active)
        await this.ergoScanner.registerExtractor(
          createEventTrigger(
            NETWORKS.doge.key,
            networkType,
            url,
            AbstractDBService.getInstance().getDataSource(),
            configs.contracts.doge,
          ),
        );
      if (configs.chains.ethereum.active)
        await this.ergoScanner.registerExtractor(
          createEventTrigger(
            NETWORKS.ethereum.key,
            networkType,
            url,
            AbstractDBService.getInstance().getDataSource(),
            configs.contracts.ethereum,
          ),
        );
      if (configs.chains['bitcoin-runes'].active)
        await this.ergoScanner.registerExtractor(
          createEventTrigger(
            NETWORKS['bitcoin-runes'].key,
            networkType,
            url,
            AbstractDBService.getInstance().getDataSource(),
            configs.contracts['bitcoin-runes'],
          ),
        );
      if (configs.chains.binance.active)
        await this.ergoScanner.registerExtractor(
          createEventTrigger(
            NETWORKS.binance.key,
            networkType,
            url,
            AbstractDBService.getInstance().getDataSource(),
            configs.contracts.binance,
          ),
        );
      this.setStatus(ServiceStatus.running);
      return true;
    } catch (e) {
      this.logger.error(
        `Something went wrong while starting the ErgoExtractorService: ${e}`,
      );
      return false;
    }
  };

  /**
   * Constructs a new ErgoExtractorService.
   * @param {ErgoScanner} ergoScanner Instance of ErgoScanner to use.
   * @param {AbstractLogger} logger instance.
   */
  constructor(logger: AbstractLogger = new DummyLogger()) {
    super(logger);
  }

  /**
   * initializes the singleton instance of ErgoExtractorService
   *
   * @static
   * @param {ErgoScanner} ergoScanner
   * @param {AbstractLogger} [logger]
   * @memberof ErgoExtractorService
   */
  static init = async (logger?: AbstractLogger): Promise<void> => {
    if (AbstractErgoExtractorsService.instance != undefined) {
      return;
    }
    AbstractErgoExtractorsService.instance = new ErgoExtractorService(logger);
  };
}
