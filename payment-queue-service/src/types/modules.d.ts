declare module 'swagger-jsdoc' {
  interface SwaggerDefinition {
    openapi?: string;
    info: {
      title: string;
      version: string;
      description?: string;
    };
    servers?: Array<{ url: string; description?: string }>;
    components?: any;
    tags?: Array<{ name: string; description?: string }>;
  }

  interface Options {
    definition?: SwaggerDefinition;
    swaggerDefinition?: SwaggerDefinition;
    apis: string[];
  }

  function swaggerJsdoc(options: Options): any;
  export = swaggerJsdoc;
}

declare module 'swagger-ui-express' {
  import { RequestHandler } from 'express';

  interface SwaggerUiOptions {
    explorer?: boolean;
    customCss?: string;
    customJs?: string;
    customfavIcon?: string;
    customSiteTitle?: string;
    swaggerOptions?: any;
  }

  export function serve(req: any, res: any, next: any): void;
  export function setup(swaggerDoc: any, options?: SwaggerUiOptions): RequestHandler;
  export const serveFiles: RequestHandler[];
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
      branchId?: string;
      stateId?: string;
      permissions?: string[];
    };
  }
}
