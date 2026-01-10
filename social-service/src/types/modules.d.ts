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
