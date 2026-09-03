/**
 * Version negotiation middleware for Express
 * Handles API version selection from headers, URL, or query parameters
 */

import { Request, Response, NextFunction } from 'express';
import {
  VersionRegistry,
  VersionNegotiator,
  FeatureFlagManager,
  VersionMigration,
  VersionNegotiationOptions,
} from '@omega-v/runtime';

export interface VersionMiddlewareOptions {
  registry: VersionRegistry;
  negotiationOptions?: VersionNegotiationOptions;
  featureFlagManager?: FeatureFlagManager;
  versionMigration?: VersionMigration;
  onUnsupportedVersion?: (req: Request, res: Response, version: string) => void;
  onDeprecatedVersion?: (req: Request, res: Response, version: string) => void;
}

/**
 * Attach version information to request object
 */
declare global {
  namespace Express {
    interface Request {
      apiVersion?: string;
      versionSource?: string;
      versionMetadata?: any;
      isVersionDeprecated?: boolean;
      isVersionActive?: boolean;
    }
  }
}

/**
 * Version negotiation middleware
 */
export function versionNegotiationMiddleware(
  options: VersionMiddlewareOptions,
) {
  const {
    registry,
    negotiationOptions,
    featureFlagManager,
    onUnsupportedVersion,
    onDeprecatedVersion,
  } = options;

  const negotiator = new VersionNegotiator(registry, negotiationOptions);

  return (req: Request, res: Response, next: NextFunction) => {
    const result = negotiator.negotiateVersion({
      headers: req.headers as Record<string, string>,
      path: req.path,
      query: req.query as Record<string, string>,
    });

    req.apiVersion = result.version;
    req.versionSource = result.source;

    const versionMetadata = registry.getVersion(result.version);
    req.versionMetadata = versionMetadata;

    if (versionMetadata) {
      req.isVersionDeprecated = versionMetadata.deprecated || false;
      req.isVersionActive = registry.isActive(result.version);

      if (versionMetadata.deprecated && onDeprecatedVersion) {
        onDeprecatedVersion(req, res, result.version);
      }

      res.setHeader('API-Version', result.version);
      res.setHeader('API-Version-Source', result.source);

      if (versionMetadata.deprecated) {
        res.setHeader('Deprecation', 'true');
        if (versionMetadata.deprecationDate) {
          res.setHeader('Deprecation-Date', versionMetadata.deprecationDate);
        }
        if (versionMetadata.sunsetDate) {
          res.setHeader('Sunset', versionMetadata.sunsetDate);
        }
      }

      // Include breaking changes if present
      if (versionMetadata.breaking && versionMetadata.breaking.length > 0) {
        res.setHeader(
          'X-Breaking-Changes',
          versionMetadata.breaking.join(', '),
        );
      }
    } else if (onUnsupportedVersion) {
      onUnsupportedVersion(req, res, result.version);
    }

    next();
  };
}

/**
 * Middleware to enforce feature availability
 */
export function featureAvailabilityMiddleware(
  featureFlagManager: FeatureFlagManager,
  requiredFeature: string,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.apiVersion) {
      return res.status(400).json({
        error: 'Version not negotiated',
        message: 'API version could not be determined',
      });
    }

    if (!featureFlagManager.isFeatureAvailable(req.apiVersion, requiredFeature)) {
      return res.status(400).json({
        error: 'Feature not available',
        message: `Feature '${requiredFeature}' is not available in API version ${req.apiVersion}`,
        apiVersion: req.apiVersion,
        feature: requiredFeature,
      });
    }

    next();
  };
}

/**
 * Middleware to auto-migrate request/response bodies between versions
 */
export function versionMigrationMiddleware(
  versionMigration: VersionMigration,
  targetVersion: string,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.apiVersion || req.apiVersion === targetVersion) {
      return next();
    }

    if (!versionMigration.hasMigration(req.apiVersion, targetVersion)) {
      return res.status(400).json({
        error: 'Version migration not supported',
        message: `Cannot migrate from ${req.apiVersion} to ${targetVersion}`,
        from: req.apiVersion,
        to: targetVersion,
      });
    }

    try {
      const migratedBody = versionMigration.migrate(
        req.body,
        req.apiVersion,
        targetVersion,
      );
      req.body = migratedBody;
      next();
    } catch (error) {
      res.status(400).json({
        error: 'Version migration failed',
        message:
          error instanceof Error ? error.message : 'Unknown migration error',
      });
    }
  };
}

/**
 * Middleware to enforce minimum version requirement
 */
export function minimumVersionMiddleware(minVersion: string, registry: VersionRegistry) {
  const minVersionObj = require('@omega-v/runtime').parseVersion(minVersion);

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.apiVersion) {
      return res.status(400).json({
        error: 'Version not negotiated',
        message: 'API version could not be determined',
      });
    }

    const reqVersionObj = require('@omega-v/runtime').parseVersion(req.apiVersion);
    const comparison = require('@omega-v/runtime').compareVersions(
      reqVersionObj,
      minVersionObj,
    );

    if (comparison < 0) {
      return res.status(400).json({
        error: 'Version too old',
        message: `Minimum API version is ${minVersion}, got ${req.apiVersion}`,
        minimumVersion: minVersion,
        requestedVersion: req.apiVersion,
      });
    }

    next();
  };
}

/**
 * Middleware to check and warn about deprecated features
 */
export function deprecatedFeatureWarningMiddleware(
  featureFlagManager: FeatureFlagManager,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.apiVersion) {
      return next();
    }

    const deprecated = featureFlagManager.getDeprecatedFeatures(req.apiVersion);
    if (deprecated.length > 0) {
      res.setHeader('X-Deprecated-Features', deprecated.join(', '));
    }

    next();
  };
}
