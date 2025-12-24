import * as mongoose from 'mongoose';
import { Connection } from 'mongoose';
import { REQUEST } from '@nestjs/core';
import { Scope, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// mongoose.connections = mongoose.connections;/

const connectionPromises: Record<string, Promise<Connection>> = {};
async function tenantConnection(tenantDB, uri) {
  Logger.log(
    `No active connection found for tenantDB = ${tenantDB}. Establishing a new one.`,
    'tenant-mongoose-connections',
  );
  // // Find existing connection
  const foundConn = mongoose.connections.find((con: Connection) => {
    return con.name === tenantDB;
  });

  // Return the same connection if it exist
  if (foundConn && foundConn.readyState === 1) {
    Logger.log(
      'Found connection tenantDB = ' + tenantDB,
      'tenant-mongoose-connections',
    );
    return foundConn;
  } else {
    Logger.log(
      'No connection found for tenantDB = ' + tenantDB,
      'tenant-mongoose-connections',
    );
  }

  if (!foundConn) {
    if (!connectionPromises[tenantDB]) {
      connectionPromises[tenantDB] = mongoose
        .createConnection(uri, {
          maxConnecting: 10,
          maxPoolSize: 100,
          maxStalenessSeconds: 100,
          maxIdleTimeMS: 500000,
          serverSelectionTimeoutMS: 500000,
          socketTimeoutMS: 500000,
          connectTimeoutMS: 500000,
        })
        .asPromise();
    }

    const newConnection = await connectionPromises[tenantDB];
    delete connectionPromises[tenantDB]; // Remove the promise after resolution

    newConnection.on('disconnected', () => {
      Logger.log(
        'DB connection ' + newConnection.name + ' is disconnected',
        'tenant-mongoose-connections',
      );
    });

    newConnection.on('error', (err: Error) => {
      Logger.error(
        `Error in connection for tenantDB = ${tenantDB}: ${err.message}`,
        'tenant-mongoose-connections',
      );
    });
    return newConnection;
  }
}

export const databaseProviders = [
  {
    provide: 'APPDATABASECONNECTIONS',
    scope: Scope.REQUEST,
    useFactory: async (
      request: Request,
      config: ConfigService,
    ): Promise<Connection> => {
      Logger.log(
        'Db connection database provider',
        'tenant-mongoose-connections',
      );

      Logger.log(
        'Number of open connections: ' + mongoose.connections.length,
        'tenant-mongoose-connections',
      );
      const subdomain = request['user']['subdomain'];
      const tenantDB: string =
        'service' +
        ':' +
        (config.get('SERVICE_SUFFIX')
          ? config.get('SERVICE_SUFFIX')
          : 'SSI_API') +
        ':' +
        subdomain;

      Logger.log({ tenantDB });

      ///
      // TODO: take this from env using configService
      const BASE_DB_PATH = config.get('BASE_DB_PATH');
      const CONFIG_DB = config.get('DB_CONFIG');
      if (!BASE_DB_PATH) {
        throw new Error('No BASE_DB_PATH set in env');
      }

      const uri = `${BASE_DB_PATH}/${tenantDB}${CONFIG_DB}`;

      Logger.log(
        'Before creating new db connection...',
        'tenant-mongoose-connections',
      );
      const newConnectionPerApp = await tenantConnection(tenantDB, uri); ///await mongoose.createConnection(uri);

      return newConnectionPerApp;
    },
    inject: [REQUEST, ConfigService],
  },
];
