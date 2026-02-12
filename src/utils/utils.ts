import * as fs from 'fs';
import * as crypto from 'crypto';
import {
  ClassSerializerInterceptor,
  Logger,
  PlainLiteralObject,
  Type,
} from '@nestjs/common';
import { ClassTransformOptions, plainToClass } from 'class-transformer';
import { Document } from 'mongoose';
import {
  ExceptionFilter,
  Catch,
  HttpException,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import bs58 from 'bs58';
export const existDir = (dirPath) => {
  if (!dirPath) throw new Error('Directory path undefined');
  return fs.existsSync(dirPath);
};

export const createDir = (dirPath) => {
  if (!dirPath) throw new Error('Directory path undefined');
  return fs.mkdirSync(dirPath, {
    recursive: true,
  });
};
export const store = (data, filePath) => {
  if (!data) throw new Error('Data undefined');
  fs.writeFileSync(filePath, JSON.stringify(data));
};

export const retrive = (filePath) => {
  return fs.readFileSync(filePath, 'utf8');
};

export const deleteFile = (filePath) => {
  return fs.unlink(filePath, (err) => {
    if (err) console.log(`Could not delete the file err ${err}`);
    console.log(`${filePath} is successfully deleted.`);
  });
};
export function MongooseClassSerializerInterceptor(
  classToIntercept: Type,
  options: ClassTransformOptions,
): typeof ClassSerializerInterceptor {
  return class Interceptor extends ClassSerializerInterceptor {
    private changePlainObjectToClass(document: PlainLiteralObject) {
      if (!(document instanceof Document)) {
        return document;
      }
      return plainToClass(classToIntercept, document.toJSON(), options);
    }
    private prepareResponse(
      response: PlainLiteralObject | PlainLiteralObject[],
    ) {
      if (Array.isArray(response)) {
        return response.map(this.changePlainObjectToClass);
      }
      return this.changePlainObjectToClass(response);
    }
    serialize(
      response: PlainLiteralObject | PlainLiteralObject[],
      options: ClassTransformOptions,
    ) {
      return super.serialize(this.prepareResponse(response), options);
    }
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status;
    let message;
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    } else {
      const msg = [];
      const error: Error = exception as Error;
      if (error.name) {
        msg.push(error.name);
      }
      if (error.message) {
        msg.push(error.message);
      }

      status = HttpStatus.INTERNAL_SERVER_ERROR;

      msg.push('Internal server error');

      message = {
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        message: msg,
      };
    }

    response.status(status).json(message);
  }
}
export async function generateAppId(length = 36) {
  Logger.log('generateAppId() method: starts....', 'AppAuthApiKeyService');

  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}
export enum StorageType {
  KEYSTORAGE = 'KEYSTORAGE',
  DATASTORAGE = 'DATASTORAGE',
}
export enum RMethods {
  'GET' = 'GET',
  'POST' = 'POST',
  'PUT' = 'PUT',
  'PATCH' = 'PATCH',
  'DELETE' = 'DELETE',
}
export enum ATTESTAION_TYPE {
  REGISTER_CREDENTIAL = 'REGISTER_CREDENTIAL',
  REGISTER_DID = 'REGISTER_DID',
  REGISTER_SCHEMA = 'REGISTER_SCHEMA',
  UPDATE_DID = 'UPDATE_DID',
  UPDATE_CREDENTIAL = 'UPDATE_CREDENTIAL',
}

export const CREDIT_COSTS = {
  API: {
    GET: 1,
    POST: 5,
    PATCH: 3,
    PUT: 3,
    DELETE: 4,
  },
  STORAGE: {
    KEYSTORAGE: 2,
    DATASTORAGE: 4,
  },
  ATTESTATION: {
    REGISTER_CREDENTIAL: 50,
    REGISTER_DID: 50,
    REGISTER_SCHEMA: 50,
    UPDATE_DID: 50,
    UPDATE_CREDENTIAL: 50,
  },
};
export function ed25519PrivateKeyFromMultibase(
  privateKeyMultibase: string,
): Uint8Array {
  if (!privateKeyMultibase || privateKeyMultibase.length < 2) {
    throw new Error('Invalid multibase key');
  }
  const prefix = privateKeyMultibase[0];

  if (prefix !== 'z') {
    throw new Error(
      `Unsupported multibase prefix "${prefix}". Only base58btc (z) is supported.`,
    );
  }
  const base58Value = privateKeyMultibase.slice(1);
  const decoded = bs58.decode(base58Value);

  if (decoded[0] !== 0x80 || decoded[1] !== 0x26) {
    throw new Error('Invalid multicodec header: not Ed25519');
  }

  const rawKey = decoded.slice(2);

  if (rawKey.length !== 32 && rawKey.length !== 64) {
    throw new Error(`Invalid Ed25519 private key length: ${rawKey.length}`);
  }
  return rawKey;
}
export const RESERVED_CLAIM  = ['iss', 'sub', 'aud', 'iat', 'exp', 'nbf', 'jti'];
