import { CallbackType } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { ErgoUTXOExtractor } from '@rosen-bridge/address-extractor';
import { ErgoScanner } from '@rosen-bridge/ergo-scanner';
import { ExtendedTokenMap, TokenMap } from '@rosen-bridge/extended-tokens';
import { ErgoNetworkType } from '@rosen-bridge/scanner-interfaces';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';
import { createClient, VercelKV } from '@vercel/kv';
import 'constants';
import crypto from 'crypto';
import * as ergoLib from 'ergo-lib-wasm-nodejs';
import fs from 'node:fs';
import path from 'node:path';

import { configs } from '../configs';
import {
  TOKEN_MAP_EXTRACTOR_LOGGER_NAME,
  TOKEN_MAP_EXTRACTOR_ID,
  ERGO_METHOD_EXPLORER,
  TOKEN_MAP_REDIS_KEY,
} from '../constants';
import { DBService } from './db';
import { ScannerService } from './scanner';

export class TokenMapService extends AbstractService {
  private tokenMap: TokenMap | ExtendedTokenMap;
  name = 'TokenMapService';
  private static instance: TokenMapService;
  private ergoScanner: ErgoScanner;
  protected dependencies: Dependency[] = [
    {
      serviceName: ScannerService.getInstance().name,
      allowedStatuses: [ServiceStatus.started],
    },
  ];
  startService = async (): Promise<boolean> => {
    return this.start();
  };

  stopService = (): Promise<boolean> => {
    return this.stop();
  };

  protected start = async (): Promise<boolean> => {
    try {
      if (!configs.tokenMap.onChainTokenMapEnabled) {
        await this.loadFromFile();
      } else {
        await this.initOnChain();
      }
      this.setStatus(ServiceStatus.running);
      return true;
    } catch (e) {
      this.logger.error(
        `Something went wrong while starting the TokenMapService: ${e}`,
      );
      return false;
    }
  };

  protected stop = async (): Promise<boolean> => {
    this.setStatus(ServiceStatus.dormant);
    return true;
  };

  constructor(
    ergoScanner: ErgoScanner,
    logger: AbstractLogger = new DummyLogger(),
  ) {
    super(logger);
    this.ergoScanner = ergoScanner;
  }

  static init = async (
    ergoScanner: ErgoScanner,
    logger?: AbstractLogger,
  ): Promise<void> => {
    if (this.instance != undefined) {
      return;
    }
    this.instance = new TokenMapService(ergoScanner, logger);
  };

  static getInstance = (): TokenMapService => {
    if (!this.instance) {
      throw new Error(`${this.name} instances is not initialized yet`);
    }
    return this.instance;
  };

  private async loadFromFile() {
    const tokensPath = path.resolve(configs.tokenMap.path!);
    if (!fs.existsSync(tokensPath)) {
      throw new Error(`TokenMap file ${tokensPath} does not exist`);
    }
    const tokensJson: string = fs.readFileSync(tokensPath, 'utf8');
    const tokens = JSON.parse(tokensJson);

    this.tokenMap = new TokenMap();
    await this.tokenMap.updateConfigByJson(tokens.tokens);
    console.log('hi');
    this.logger.info(`TokenMap loaded from ${tokensPath}`);
  }

  private async initOnChain() {
    if (
      !configs.contracts.ergo.addresses.tokenMap ||
      !configs.contracts.ergo.tokens.tokenMap
    ) {
      throw new Error('On-chain token map address or token not defined');
    }
    let networkType: ErgoNetworkType;
    let url: string;
    if (configs.chains.ergo.method == ERGO_METHOD_EXPLORER) {
      networkType = ErgoNetworkType.Explorer;
      url = configs.chains.ergo.explorer.connections[0].url!;
    } else {
      networkType = ErgoNetworkType.Node;
      url = configs.chains.ergo.node.connections[0].url!;
    }
    const tokenMapBoxExtractor = new ErgoUTXOExtractor(
      DBService.getInstance().dataSource,
      TOKEN_MAP_EXTRACTOR_ID,
      ergoLib.NetworkPrefix.Mainnet,
      url,
      networkType,
      configs.contracts.ergo.addresses.tokenMap,
      [configs.contracts.ergo.tokens.tokenMap],
      this.logger.child(TOKEN_MAP_EXTRACTOR_LOGGER_NAME),
    );

    await this.ergoScanner.registerExtractor(tokenMapBoxExtractor);

    this.tokenMap = new ExtendedTokenMap();

    const redis = createClient({
      url: configs.redis.address,
      token: configs.redis.token,
    });

    const updateTokenMapWrapper = async () =>
      await this.updateTokenMap(this.tokenMap as ExtendedTokenMap, redis);

    [
      CallbackType.Insert,
      CallbackType.Update,
      CallbackType.Spend,
      CallbackType.Delete,
    ].forEach((type) => tokenMapBoxExtractor.hook(type, updateTokenMapWrapper));

    this.logger.info('On-chain TokenMap initialized and extractor registered');
  }

  private updateTokenMap = async (
    tokenMap: ExtendedTokenMap,
    redis: VercelKV,
  ) => {
    const boxes = await DBService.getInstance().getTokenMapBoxes();
    await tokenMap.updateConfigByBoxes(boxes.map((box) => box.serialized));

    const tokenMapJSON = JSON.stringify(tokenMap.getConfig());
    const tokenMapHash = crypto.hash('sha256', tokenMapJSON);

    await redis.set(TOKEN_MAP_REDIS_KEY, {
      hash: tokenMapHash,
      tokenMap: tokenMap.getConfig(),
    });
  };

  getTokenMap = (): TokenMap | ExtendedTokenMap => {
    if (!this.tokenMap) {
      throw new Error('TokenMapService not initialized');
    }
    return this.tokenMap;
  };
}
