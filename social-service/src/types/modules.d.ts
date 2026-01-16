declare module 'compression' {
  import { RequestHandler } from 'express';

  interface CompressionOptions {
    filter?: (req: unknown, res: unknown) => boolean;
    level?: number;
    memLevel?: number;
    strategy?: number;
    threshold?: number | string;
    windowBits?: number;
    chunkSize?: number;
  }

  function compression(options?: CompressionOptions): RequestHandler;

  export = compression;
}

// Extend Express Request type
declare namespace Express {
  export interface Request {
    requestId?: string;
    user?: {
      id: string;
      email: string;
      role?: string;
      roles?: string[];
    };
  }
}
