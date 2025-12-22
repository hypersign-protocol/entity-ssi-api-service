import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { existDir, createDir, store } from './utils/utils';
import { HypersignSSISdk } from 'hs-ssi-sdk';
import { json, urlencoded } from 'express';
import * as path from 'path';
import * as express from 'express';
// eslint-disable-next-line
const hidWallet = require('hid-hd-wallet');
import { EnglishMnemonic } from '@cosmjs/crypto';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EdvClientKeysManager } from './edv/services/edv.singleton';
import { VaultWalletManager } from './edv/services/vaultWalletManager';
import { DidModule } from './did/did.module';
import { SchemaModule } from './schema/schema.module';
import { PresentationModule } from './presentation/presentation.module';
import { CredentialModule } from './credential/credential.module';
import { StatusModule } from './status/status.module';
import { CreditManagerModule } from './credit-manager/credit-manager.module';
import { UsageModule } from './usage/usage.module';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  app.use(express.static(path.join(__dirname, '../public')));

  // Adding prefix to our api

  const walletOptions = {
    hidNodeRestUrl: process.env.HID_NETWORK_API,
    hidNodeRPCUrl: process.env.HID_NETWORK_RPC,
  };
  const hidWalletInstance = new hidWallet(walletOptions);
  await hidWalletInstance.generateWallet({
    mnemonic: process.env.MNEMONIC,
  });

  // HID SDK instance
  const offlineSigner = hidWalletInstance.offlineSigner;
  const nodeRpcEndpoint = walletOptions.hidNodeRPCUrl;
  const nodeRestEndpoint = walletOptions.hidNodeRestUrl;
  const namespace = process.env.HID_NETWORK_NAMESPACE || '';
  const hsSSIdkInstance = new HypersignSSISdk({
    offlineSigner,
    nodeRpcEndpoint,
    nodeRestEndpoint,
    namespace,
  });
  await hsSSIdkInstance.init();
  globalThis.hsSSIdkInstance = hsSSIdkInstance;

  const mnemonic_EnglishMnemonic: EnglishMnemonic = process.env
    .MNEMONIC as unknown as EnglishMnemonic;

  const kmsVaultWallet = await VaultWalletManager.getWallet(
    mnemonic_EnglishMnemonic,
  );

  app.setGlobalPrefix('api/v1/');

  app.use((req, res, next) => {
    Logger.debug({ edv_stats: process.env.EDV_STATUS }, '/api/v1/edv/state');
    if (req.path == '/api/v1/edv/state' && process.env.EDV_STATUS !== 'DOWN') {
      return res.status(200).json({
        status: 200,
        isEdvLive: true,
      });
    }
    if (req.path == '/api/v1/edv/state' && process.env.EDV_STATUS == 'DOWN') {
      return res.status(502).json({
        status: 502,
        isEdvLive: false,
      });
    }
    next();
  });

  if (!existDir(process.env.EDV_CONFIG_DIR)) {
    createDir(process.env.EDV_CONFIG_DIR);
  }
  if (!existDir(process.env.EDV_DID_FILE_PATH)) {
    store(kmsVaultWallet.didDocument, process.env.EDV_DID_FILE_PATH);
  }
  if (!existDir(process.env.EDV_KEY_FILE_PATH)) {
    store(kmsVaultWallet.keys, process.env.EDV_KEY_FILE_PATH);
  }

  const config = new ConfigService();
  try {
    // Super admin keymanager setup
    Logger.log('Before keymanager initialization', 'main');
    const kmsVaultManager = new EdvClientKeysManager();
    const vaultPrefixInEnv = config.get('VAULT_PREFIX');
    const vaultPrefix =
      vaultPrefixInEnv && vaultPrefixInEnv != 'undefined'
        ? vaultPrefixInEnv
        : 'hs:developer-dashboard:';
    const edvId = vaultPrefix + 'kms:' + kmsVaultWallet.didDocument.id;
    const kmsVault = await kmsVaultManager.createVault(kmsVaultWallet, edvId);
    // TODO rename this to kmsVault for bnetter cla
    globalThis.kmsVault = kmsVault;

    Logger.log('After  keymanager initialization', 'main');
    process.env.EDV_STATUS = 'UP';
  } catch (e) {
    Logger.error('Could not initialize keymanager', 'main');
    process.env.EDV_STATUS = 'DOWN';
    Logger.error(e);
  }

  try {
    // Swagger documentation setup
    const tenantDocConfig = new DocumentBuilder()
      .setTitle('Entity Self Sovereign Identity (SSI) APIs')
      .setDescription('Open API Documentation for Entity SSI')
      .addBearerAuth(
        {
          type: 'http',
          name: 'Authorization',
          in: 'header',
        },
        'Authorization',
      )
      .setVersion('1.0')
      .build();

    const tenantDocuments = SwaggerModule.createDocument(app, tenantDocConfig, {
      include: [
        DidModule,
        SchemaModule,
        CredentialModule,
        PresentationModule,
        StatusModule,
        CreditManagerModule,
        UsageModule,
      ], // don't include, say, BearsModule
    });

    const tenantOptions = {
      swaggerOptions: {
        defaultModelsExpandDepth: -1,
      },
      customfavIcon: '/Entity_favicon.png',
      customSiteTitle: 'API-Playground',
      customCss: ` .topbar-wrapper img {content:url(\'./Entity_full.png\'); width:135px; height:auto;margin-left: -150px;}
      .swagger-ui .topbar { background-color: #fff; }`,
    };
    SwaggerModule.setup('/', app, tenantDocuments, tenantOptions);
  } catch (e) {
    Logger.error(e);
  }
  await app.listen(process.env.PORT || 3001);
  Logger.log(
    `Server running on http://localhost:${process.env.PORT}`,
    'Bootstrap',
  );
}

bootstrap();
