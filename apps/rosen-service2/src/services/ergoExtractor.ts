import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { ErgoObservationExtractor } from '@rosen-bridge/ergo-observation-extractor';
import { ErgoScanner } from '@rosen-bridge/ergo-scanner';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';
import { NETWORKS } from '@rosen-ui/constants';
import 'constants';
import { createEventTrigger } from 'scanners/ergo';
import { resolveErgoNetworkConfig } from 'utils';

import { configs } from '../configs';
import { DBService } from './db';
import { TokenMapService } from './tokenMap';

export class ErgoExtractorService extends AbstractService {
  private ergoScanner: ErgoScanner;
  name = 'ErgoExtractorService';
  private static instance: ErgoExtractorService;
  protected dependencies: Dependency[] = [
    {
      serviceName: DBService.getInstance().name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: TokenMapService.getInstance().name,
      allowedStatuses: [ServiceStatus.running],
    },
  ];

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
        DBService.getInstance().dataSource,
        TokenMapService.getInstance().getTokenMap(),
        this.logger.child('ergoObservationExtractor'),
      );
      await this.ergoScanner.registerExtractor(ergoObservationExtractor);
      const ergoEventTriggerExtractor = createEventTrigger(
        NETWORKS.ergo.key,
        networkType,
        url,
        DBService.getInstance().dataSource,
        configs.contracts.ergo,
      );
      await this.ergoScanner.registerExtractor(ergoEventTriggerExtractor);
      if (configs.chains.cardano.active)
        await this.ergoScanner.registerExtractor(
          createEventTrigger(
            NETWORKS.cardano.key,
            networkType,
            url,
            DBService.getInstance().dataSource,
            configs.contracts.cardano,
          ),
        );
      if (configs.chains.bitcoin.active)
        await this.ergoScanner.registerExtractor(
          createEventTrigger(
            NETWORKS.binance.key,
            networkType,
            url,
            DBService.getInstance().dataSource,
            configs.contracts.bitcoin,
          ),
        );
      if (configs.chains.doge.active)
        await this.ergoScanner.registerExtractor(
          createEventTrigger(
            NETWORKS.doge.key,
            networkType,
            url,
            DBService.getInstance().dataSource,
            configs.contracts.doge,
          ),
        );
      if (configs.chains.ethereum.active)
        await this.ergoScanner.registerExtractor(
          createEventTrigger(
            NETWORKS.ethereum.key,
            networkType,
            url,
            DBService.getInstance().dataSource,
            configs.contracts.ethereum,
          ),
        );
      if (configs.chains['bitcoin-runes'].active)
        await this.ergoScanner.registerExtractor(
          createEventTrigger(
            NETWORKS['bitcoin-runes'].key,
            networkType,
            url,
            DBService.getInstance().dataSource,
            configs.contracts['bitcoin-runes'],
          ),
        );
      if (configs.chains.binance.active)
        await this.ergoScanner.registerExtractor(
          createEventTrigger(
            NETWORKS.binance.key,
            networkType,
            url,
            DBService.getInstance().dataSource,
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
  constructor(
    ergoScanner: ErgoScanner,
    logger: AbstractLogger = new DummyLogger(),
  ) {
    super(logger);
    this.ergoScanner = ergoScanner;
  }

  /**
   * initializes the singleton instance of ErgoExtractorService
   *
   * @static
   * @param {ErgoScanner} ergoScanner
   * @param {AbstractLogger} [logger]
   * @memberof ErgoExtractorService
   */
  static init = async (
    ergoScanner: ErgoScanner,
    logger?: AbstractLogger,
  ): Promise<void> => {
    if (this.instance != undefined) {
      return;
    }
    this.instance = new ErgoExtractorService(ergoScanner, logger);
  };

  /**
   * Returns the singleton instance.
   * @returns {ErgoExtractorService} The initialized instance.
   * @throws {Error} If the instance has not been initialized yet.
   */
  static getInstance = (): ErgoExtractorService => {
    if (!this.instance) {
      throw new Error(`${this.name} instances is not initialized yet`);
    }
    return this.instance;
  };
}
