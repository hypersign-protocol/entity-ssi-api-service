import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

const VERIFICATION_METHOD_ID_REGEX =
  /^did:hid:(testnet:)?[a-zA-Z0-9]{32,}#[a-zA-Z0-9\-]+$/;

export function ValidateVerificationMethodId(
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'ValidateVerificationMethodId',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} contains an invalid verification method id`,
        ...validationOptions,
      },
      validator: {
        validate(value: any, _args: ValidationArguments) {
          // Handle array case
          if (Array.isArray(value)) {
            if (value.length === 0) return false;

            return value.every((v) => isValidVerificationMethodId(v));
          }

          // Handle single string case
          return isValidVerificationMethodId(value);
        },
      },
    });
  };
}

function isValidVerificationMethodId(value: any): boolean {
  if (typeof value !== 'string') return false;
  if (!value.trim()) return false;

  return VERIFICATION_METHOD_ID_REGEX.test(value);
}
