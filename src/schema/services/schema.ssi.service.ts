import { Injectable, Logger, Scope } from '@nestjs/common';

import { HypersignSchema } from 'hs-ssi-sdk';

import { ConfigService } from '@nestjs/config';
import { HidWalletService } from '../../hid-wallet/services/hid-wallet.service';

@Injectable({ scope: Scope.REQUEST })
export class SchemaSSIService {
  constructor(
    private readonly config: ConfigService,
    private readonly hidWallet: HidWalletService,
  ) {}

  private logStart(fn: string, description: string) {
    const start = performance.now();
    Logger.log(`Starting ${fn}() - ${description}`, `SchemaSSIService.${fn}`);
    return start;
  }

  private logEnd(fn: string, start: number) {
    const elapsed = (performance.now() - start).toFixed(2);
    Logger.log(`${fn} finished in ${elapsed}ms`, `SchemaSSIService.${fn}`);
  }

  async initiateHypersignSchema(mnemonic: string, namespace: string) {
    const start = this.logStart(
      'initiateHypersignSchema',
      'initialize a Hypersign schema client with the provided mnemonic',
    );
    try {
      const nodeRpcEndpoint = this.config.get('HID_NETWORK_RPC');
      const nodeRestEndpoint = this.config.get('HID_NETWORK_API');
      await this.hidWallet.generateWallet(mnemonic);
      Logger.log(
        'initiateHypersignSchema() method: before getting offlinesigner',
        'SchemaSSIService',
      );
      const offlineSigner = this.hidWallet.getOfflineSigner();
      const hypersignSchema = new HypersignSchema({
        offlineSigner,
        nodeRpcEndpoint,
        nodeRestEndpoint,
        namespace: namespace,
      });
      await hypersignSchema.init();
      return hypersignSchema;
    } finally {
      this.logEnd('initiateHypersignSchema', start);
    }
  }
}
