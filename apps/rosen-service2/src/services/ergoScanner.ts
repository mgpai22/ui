import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  FailoverStrategy,
  NetworkConnectorManager,
} from '@rosen-bridge/abstract-scanner';
import {
  ErgoExplorerNetwork,
  ErgoNodeNetwork,
  ErgoScanner,
} from '@rosen-bridge/ergo-scanner';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { Transaction } from '@rosen-bridge/scanner-interfaces';
import {
  Dependency,
  PeriodicTaskService,
  ServiceStatus,
  Task,
} from '@rosen-bridge/service-manager';
import 'constants';

import { configs } from '../configs';
import { ERGO_METHOD_EXPLORER } from '../constants';
import { ErgoExtractorService } from './ergoExtractor';

export class ErgoScannerService extends PeriodicTaskService {
  name = 'ErgoScannerService';
  private static instance: ErgoScannerService;
  private ergoScanner: ErgoScanner;
  protected dependencies: Dependency[] = [
    {
      serviceName: ErgoExtractorService.name,
      allowedStatuses: [ServiceStatus.running],
    },
  ];

  protected postStop = async () => {};

  protected preStart = async () => {};

  /**
   * Runs the scanner update function at configured intervals.
   * @returns {Task[]} Array of scheduled tasks.
   */
  protected getTasks = (): Task[] => {
    return [
      {
        fn: this.ergoScanner.update,
        interval: configs.chains.ergo.scanInterval,
      },
    ];
  };

  /**
   * Creates a new ErgoScannerService instance.
   *
   * @param {DataSource} dataSource Database data source used by the scanner.
   * @param {AbstractLogger} [logger=new DummyLogger()] Optional logger instance.
   */
  constructor(
    dataSource: DataSource,
    logger: AbstractLogger = new DummyLogger(),
  ) {
    super(logger);
    this.ergoScanner = this.createErgoScanner(dataSource);
  }

  /**
   * Initializes the singleton instance of the service.
   *
   * @param {DataSource} dataSource Database data source.
   * @param {AbstractLogger} [logger] Optional logger instance.
   */
  static init = async (
    dataSource: DataSource,
    logger?: AbstractLogger,
  ): Promise<void> => {
    if (this.instance != undefined) {
      return;
    }
    this.instance = new ErgoScannerService(dataSource, logger);
  };

  /**
   * Returns the singleton instance of the service.
   * @returns {ErgoScannerService} The initialized instance.
   * @throws {Error} If the service has not been initialized.
   */
  static getInstance = (): ErgoScannerService => {
    if (!this.instance) {
      throw new Error(`${this.name} instances is not initialized yet`);
    }
    return this.instance;
  };

  /**
   * Returns the underlying ErgoScanner instance.
   * @returns {ErgoScanner} The scanner instance.
   */
  public getErgoScanner = (): ErgoScanner => {
    return this.ergoScanner;
  };

  /**
   * Creates and configures an ErgoScanner instance.
   * Sets up a  NetworkConnectorManager with a failover strategy and
   * registers either explorer or node connectors based on configuration.
   * @param {DataSource} dataSource Database data source.
   * @returns {ErgoScanner} Configured Ergo scanner instance.
   */
  private createErgoScanner = (dataSource: DataSource): ErgoScanner => {
    const networkConnectorManager = new NetworkConnectorManager<Transaction>(
      new FailoverStrategy(),
      this.logger.child('ergoScannerLogger'),
    );
    if (configs.chains.ergo.method == ERGO_METHOD_EXPLORER) {
      configs.chains.ergo.explorer.connections.forEach((explorer) => {
        networkConnectorManager.addConnector(
          new ErgoExplorerNetwork(explorer.url!),
        );
      });
    } else {
      configs.chains.ergo.node.connections.forEach((node) => {
        networkConnectorManager.addConnector(new ErgoNodeNetwork(node.url!));
      });
    }
    return new ErgoScanner({
      dataSource: dataSource,
      initialHeight: configs.chains.ergo.initialHeight,
      network: networkConnectorManager,
      blockRetrieveGap: configs.chains.ergo.blockRetrieveGap,
      logger: this.logger.child('ergoScannerLogger'),
    });
  };
}
