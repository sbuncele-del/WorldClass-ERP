import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId?: number;
        user_id?: number;
        tenantId?: number;
        tenant_id?: string;
        id?: string;
        email: string;
        role: string;
        permissions?: string[];
        first_name?: string;
        last_name?: string;
      };
    }
  }
}

export {};
