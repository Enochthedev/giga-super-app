// Extend Express Request type for admin service
declare namespace Express {
  export interface Request {
    requestId?: string;
    user?: {
      id: string;
      email: string;
      role?: string;
      roles?: string[];
      accessLevel?: string;
      branchId?: string;
      stateId?: string;
    };
  }
}
