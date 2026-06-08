import { Injectable, Logger, Scope } from '@nestjs/common';
import { HypersignDID, HypersignSSISdk } from 'hs-ssi-sdk';
import { ConfigService } from '@nestjs/config';
import { HidWalletService } from '../../hid-wallet/services/hid-wallet.service';

@Injectable({ scope: Scope.REQUEST })
export class DidSSIService {
  constructor(
    private readonly config: ConfigService,
    private readonly hidWallet: HidWalletService,
  ) {}

  private logStart(fn: string, description: string) {
    const start = performance.now();
    Logger.debug(`Starting ${fn}() - ${description}`, `DidSSIService.${fn}`);
    return start;
  }

  private logEnd(fn: string, start: number) {
    const elapsed = (performance.now() - start).toFixed(2);
    Logger.debug(`${fn} finished in ${elapsed}ms`, `DidSSIService.${fn}`);
  }

  async initiateHypersignDid(mnemonic: string, namespace: string) {
    const start = this.logStart(
      'initiateHypersignDid',
      'initialize a Hypersign DID instance with a signer from mnemonic',
    );
    try {
      const nodeRpcEndpoint = this.config.get('HID_NETWORK_RPC');
      const nodeRestEndpoint = this.config.get('HID_NETWORK_API');
      await this.hidWallet.generateWallet(mnemonic);
      Logger.log(
        'initiateHypersignDid() method: before getting offlinesigner',
        'DidSSIService',
      );
      const offlineSigner = this.hidWallet.getOfflineSigner();
      const hypersignDid = new HypersignDID({
        offlineSigner,
        nodeRpcEndpoint,
        nodeRestEndpoint,
        namespace: namespace,
      });
      await hypersignDid.init();
      return hypersignDid;
    } finally {
      this.logEnd('initiateHypersignDid', start);
    }
  }

  async initiateHypersignDidOffline(namespace: string) {
    const start = this.logStart(
      'initiateHypersignDidOffline',
      'initialize a Hypersign DID instance without a local signer',
    );
    try {
      const nodeRpcEndpoint = this.config.get('HID_NETWORK_RPC');
      const nodeRestEndpoint = this.config.get('HID_NETWORK_API');
      const hypersignDid = new HypersignDID({
        nodeRpcEndpoint,
        nodeRestEndpoint,
        namespace: namespace,
      });
      return hypersignDid;
    } finally {
      this.logEnd('initiateHypersignDidOffline', start);
    }
  }

  async initiateHyperSignBJJDid(mnemonic: string, namespace: string) {
    const start = this.logStart(
      'initiateHyperSignBJJDid',
      'initialize a Hypersign BJJ DID instance with mnemonic signer',
    );
    try {
      const nodeRpcEndpoint = this.config.get('HID_NETWORK_RPC');
      const nodeRestEndpoint = this.config.get('HID_NETWORK_API');
      await this.hidWallet.generateWallet(mnemonic);
      Logger.log(
        'initiateHypersignBJJDid() method: before getting offlinesigner',
        'DidSSIService',
      );
      const offlineSigner = this.hidWallet.getOfflineSigner();
      const hsSdk = new HypersignSSISdk({
        offlineSigner,
        nodeRpcEndpoint,
        nodeRestEndpoint,
        namespace: namespace,
      });
      await hsSdk.init();
      const hypersignBjjDid = hsSdk.did.bjjDID;
      return hypersignBjjDid;
    } finally {
      this.logEnd('initiateHyperSignBJJDid', start);
    }
  }

  async initiateHyperSignBJJDidOffline(namespace: string) {
    const start = this.logStart(
      'initiateHyperSignBJJDidOffline',
      'initialize a Hypersign BJJ DID instance without wallet signer',
    );
    try {
      const nodeRpcEndpoint = this.config.get('HID_NETWORK_RPC');
      const nodeRestEndpoint = this.config.get('HID_NETWORK_API');
      Logger.log(
        'initiateHypersignBJJDid() method: before getting offlinesigner',
        'DidSSIService',
      );
      const hypersignDid = new HypersignDID({
        nodeRpcEndpoint,
        nodeRestEndpoint,
        namespace: namespace,
      });
      const hypersignBjjDid = hypersignDid.bjjDID;
      return hypersignBjjDid;
    } finally {
      this.logEnd('initiateHyperSignBJJDidOffline', start);
    }
  }
}
