// Extend Express Request type globally
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: {
        id: string;
        email: string;
        role?: string;
        roles?: string[];
        app_metadata?: Record<string, any>;
        user_metadata?: Record<string, any>;
      };
      courier?: {
        id: string;
        is_active: boolean;
        is_verified: boolean;
      };
    }
  }
}

export {};
