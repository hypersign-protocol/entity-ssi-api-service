// access.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ACCESS_KEY } from '../customDecorator/access.decorator';

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      ACCESS_KEY,
      context.getHandler(),
    );
    if (!requiredPermissions) return true;
    const req = context.switchToHttp().getRequest();
    const tokenPermissions: string[] = req.user?.accessList ?? [];
    const authorized = requiredPermissions.every((p) =>
      tokenPermissions.includes(p),
    );
    if (!authorized) {
      throw new ForbiddenException([
        'Permission denied: Missing access rights',
      ]);
    }

    return true;
  }
}
