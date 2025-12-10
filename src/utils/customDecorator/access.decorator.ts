import { SetMetadata } from '@nestjs/common';

export const ACCESS_KEY = 'access_required';

export const Access = (...permissions: string[]) =>
  SetMetadata(ACCESS_KEY, permissions);
