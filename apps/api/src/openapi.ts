/**
 * OpenAPI spec loader and Swagger UI integration
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
  };
  paths: Record<string, any>;
  [key: string]: any;
}

/**
 * Load OpenAPI spec from file
 */
export function loadOpenAPISpec(): OpenAPISpec {
  try {
    const specPath = join(process.cwd(), 'apps/api/openapi.json');
    const spec = readFileSync(specPath, 'utf-8');
    return JSON.parse(spec);
  } catch (error) {
    console.warn('Failed to load OpenAPI spec:', error);
    return getDefaultOpenAPISpec();
  }
}

/**
 * Get default minimal OpenAPI spec
 */
function getDefaultOpenAPISpec(): OpenAPISpec {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Ω∞v Oceanicos API',
      description: 'Verification loop API',
      version: '0.1.0',
    },
    paths: {},
  };
}

/**
 * Swagger UI options
 */
export const swaggerUIOptions = {
  swaggerOptions: {
    persistAuthorization: true,
    displayOperationId: true,
    docExpansion: 'list' as const,
    defaultModelsExpandDepth: 1,
    deepLinking: true,
  },
  customCss: `
    .swagger-ui .topbar {
      background-color: #1a1a2e;
    }
    .swagger-ui .info {
      margin: 20px 0;
    }
    .swagger-ui .scheme-container {
      background: #f5f5f5;
      border-radius: 4px;
    }
  `,
  customSiteTitle: 'Ω∞v Oceanicos API Documentation',
};
