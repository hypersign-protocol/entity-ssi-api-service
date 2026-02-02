import {
  applyDecorators,
  SetMetadata,
  BadRequestException,
} from '@nestjs/common';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export const IsDid = (): PropertyDecorator => {
  return applyDecorators(
    SetMetadata('isDid', true),
    (target: object, propertyKey: string | symbol) => {
      let original = target[propertyKey];
      const descriptor: PropertyDescriptor = {
        get: () => original,
        set: (val: any) => {
          if (!val || typeof val !== 'string' || val.trim() === '') {
            throw new BadRequestException([
              `${propertyKey.toString()} cannot be empty`,
            ]);
          }

          const did = val.trim();
          const HID_DID_REGEX =
            /^did:hid:(?:[a-z0-9]{1,10}:)?[A-Za-z0-9_-]{3,64}$/;

          if (!HID_DID_REGEX.test(did)) {
            throw new BadRequestException([
              `Invalid ${propertyKey.toString()} format: ${did}`,
            ]);
          }
          const methodSpecificId = did.split(':').at(-1);

          if (!methodSpecificId || methodSpecificId.trim() === '') {
            throw new BadRequestException([
              `Invalid ${propertyKey.toString()}: methodSpecificId missing`,
            ]);
          }
          original = did;
        },
      };
      Object.defineProperty(target, propertyKey, descriptor);
    },
  );
};

@ValidatorConstraint({ async: false })
export class IsMethodSpecificIdConstraint
  implements ValidatorConstraintInterface
{
  validate(value: any): boolean {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException('Value cannot be empty');
    }

    const did = value.trim();
    if (
      did.includes('did:hid:') ||
      did.includes('hid') ||
      did.includes(':') ||
      did.includes('.')
    ) {
      throw new BadRequestException('Invalid method-specific ID');
    }

    return true;
  }

  defaultMessage(): string {
    return 'Invalid method-specific ID format';
  }
}

export function IsMethodSpecificId(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsMethodSpecificIdConstraint,
    });
  };
}
