/**
 * API versioning system for managing multiple API versions
 * Supports version negotiation, feature flags, and deprecation management
 */

export type VersionFormat = 'semver' | 'integer' | 'date';
export type VersionSource = 'header' | 'url' | 'query';

export interface Version {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

export interface VersionMetadata {
  version: string;
  releaseDate: string;
  deprecated?: boolean;
  deprecationDate?: string;
  sunsetDate?: string;
  features: Set<string>;
  breaking?: string[];
}

export interface VersionNegotiationOptions {
  sources?: VersionSource[];
  headerName?: string;
  urlPattern?: string;
  queryParam?: string;
  defaultVersion?: string;
  preferLatest?: boolean;
}

export interface VersionFeature {
  name: string;
  addedIn: string;
  removedIn?: string;
  deprecated?: boolean;
  deprecatedIn?: string;
}

/**
 * Parse semantic version string
 */
export function parseVersion(versionStr: string): Version {
  const match = versionStr.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) {
    throw new Error(`Invalid semantic version: ${versionStr}`);
  }

  const [, major, minor, patch, prerelease] = match;
  return {
    major: parseInt(major, 10),
    minor: parseInt(minor, 10),
    patch: parseInt(patch, 10),
    prerelease,
  };
}

/**
 * Compare two versions
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1: Version, v2: Version): number {
  if (v1.major !== v2.major) return v1.major < v2.major ? -1 : 1;
  if (v1.minor !== v2.minor) return v1.minor < v2.minor ? -1 : 1;
  if (v1.patch !== v2.patch) return v1.patch < v2.patch ? -1 : 1;

  // Prerelease versions are less than release versions
  if (!v1.prerelease && v2.prerelease) return 1;
  if (v1.prerelease && !v2.prerelease) return -1;
  if (v1.prerelease && v2.prerelease) {
    return v1.prerelease.localeCompare(v2.prerelease);
  }

  return 0;
}

/**
 * Check if version is supported
 */
export function isVersionSupported(
  version: Version,
  minVersion: Version,
  maxVersion?: Version
): boolean {
  if (compareVersions(version, minVersion) < 0) {
    return false;
  }

  if (maxVersion && compareVersions(version, maxVersion) > 0) {
    return false;
  }

  return true;
}

/**
 * Version string formatter
 */
export function formatVersion(version: Version): string {
  let str = `${version.major}.${version.minor}.${version.patch}`;
  if (version.prerelease) {
    str += `-${version.prerelease}`;
  }
  return str;
}

/**
 * API Version Registry
 */
export class VersionRegistry {
  private versions: Map<string, VersionMetadata> = new Map();
  private featureRegistry: Map<string, VersionFeature> = new Map();

  /**
   * Register API version
   */
  registerVersion(metadata: VersionMetadata): void {
    if (this.versions.has(metadata.version)) {
      throw new Error(`Version ${metadata.version} already registered`);
    }

    this.versions.set(metadata.version, {
      ...metadata,
      features: new Set(metadata.features),
    });
  }

  /**
   * Register feature for version
   */
  registerFeature(feature: VersionFeature): void {
    this.featureRegistry.set(feature.name, feature);
  }

  /**
   * Get version metadata
   */
  getVersion(versionStr: string): VersionMetadata | undefined {
    return this.versions.get(versionStr);
  }

  /**
   * Get feature metadata
   */
  getFeature(featureName: string): VersionFeature | undefined {
    return this.featureRegistry.get(featureName);
  }

  /**
   * Check if version has feature
   */
  hasFeature(versionStr: string, featureName: string): boolean {
    const version = this.versions.get(versionStr);
    return version ? version.features.has(featureName) : false;
  }

  /**
   * List all versions
   */
  listVersions(): VersionMetadata[] {
    return Array.from(this.versions.values());
  }

  /**
   * Get latest version
   */
  getLatestVersion(): VersionMetadata | undefined {
    let latest: VersionMetadata | undefined;

    for (const version of this.versions.values()) {
      if (version.deprecated) continue;

      if (!latest) {
        latest = version;
      } else {
        const v1 = parseVersion(version.version);
        const v2 = parseVersion(latest.version);

        if (compareVersions(v1, v2) > 0) {
          latest = version;
        }
      }
    }

    return latest;
  }

  /**
   * Get supported versions
   */
  getSupportedVersions(): VersionMetadata[] {
    return Array.from(this.versions.values()).filter(
      (v) => !v.deprecated || (v.sunsetDate && new Date(v.sunsetDate) > new Date())
    );
  }

  /**
   * Get deprecated versions
   */
  getDeprecatedVersions(): VersionMetadata[] {
    return Array.from(this.versions.values()).filter((v) => v.deprecated);
  }

  /**
   * Check if version is active (not sunset)
   */
  isActive(versionStr: string): boolean {
    const version = this.versions.get(versionStr);
    if (!version) return false;

    if (version.sunsetDate) {
      return new Date(version.sunsetDate) > new Date();
    }

    return true;
  }
}

/**
 * Version Negotiator for selecting appropriate API version
 */
export class VersionNegotiator {
  private registry: VersionRegistry;
  private options: Required<VersionNegotiationOptions>;

  constructor(registry: VersionRegistry, options: VersionNegotiationOptions = {}) {
    this.registry = registry;
    this.options = {
      sources: options.sources || ['header', 'url', 'query'],
      headerName: options.headerName || 'api-version',
      urlPattern: options.urlPattern || '/api/v:version',
      queryParam: options.queryParam || 'version',
      defaultVersion: options.defaultVersion || '1.0.0',
      preferLatest: options.preferLatest || false,
    };
  }

  /**
   * Negotiate version from request context
   */
  negotiateVersion(context: {
    headers?: Record<string, string>;
    path?: string;
    query?: Record<string, string>;
  }): {
    version: string;
    source: VersionSource | 'default';
  } {
    // Try header-based version
    if (this.options.sources.includes('header') && context.headers) {
      const headerValue = Object.entries(context.headers).find(
        ([key]) => key.toLowerCase() === this.options.headerName.toLowerCase()
      )?.[1];

      if (headerValue) {
        const supportedVersions = this.registry.getSupportedVersions();
        if (supportedVersions.some((v) => v.version === headerValue)) {
          return { version: headerValue, source: 'header' };
        }
      }
    }

    // Try URL-based version
    if (this.options.sources.includes('url') && context.path) {
      const match = context.path.match(/\/api\/v(\d+\.?\d*\.?\d*)/);
      if (match) {
        const versionStr = match[1];
        const supportedVersions = this.registry.getSupportedVersions();

        if (supportedVersions.some((v) => v.version === versionStr)) {
          return { version: versionStr, source: 'url' };
        }
      }
    }

    // Try query parameter
    if (this.options.sources.includes('query') && context.query) {
      const queryVersion = context.query[this.options.queryParam];
      if (queryVersion) {
        const supportedVersions = this.registry.getSupportedVersions();

        if (supportedVersions.some((v) => v.version === queryVersion)) {
          return { version: queryVersion, source: 'query' };
        }
      }
    }

    // Use default or latest
    if (this.options.preferLatest) {
      const latest = this.registry.getLatestVersion();
      if (latest) {
        return { version: latest.version, source: 'default' };
      }
    }

    return {
      version: this.options.defaultVersion,
      source: 'default',
    };
  }
}

/**
 * Version-aware feature flag manager
 */
export class FeatureFlagManager {
  private registry: VersionRegistry;
  private overrides: Map<string, Set<string>> = new Map();

  constructor(registry: VersionRegistry) {
    this.registry = registry;
  }

  /**
   * Check if feature is available in version
   */
  isFeatureAvailable(versionStr: string, featureName: string): boolean {
    // Check overrides first
    const overrideSet = this.overrides.get(versionStr);
    if (overrideSet?.has(featureName)) {
      return true;
    }

    return this.registry.hasFeature(versionStr, featureName);
  }

  /**
   * Override feature availability for specific version
   */
  overrideFeature(versionStr: string, featureName: string): void {
    if (!this.overrides.has(versionStr)) {
      this.overrides.set(versionStr, new Set());
    }
    this.overrides.get(versionStr)!.add(featureName);
  }

  /**
   * Get available features for version
   */
  getAvailableFeatures(versionStr: string): string[] {
    const version = this.registry.getVersion(versionStr);
    if (!version) return [];

    const features = Array.from(version.features);
    const overrides = this.overrides.get(versionStr);

    if (overrides) {
      features.push(...overrides);
    }

    return [...new Set(features)];
  }

  /**
   * Get deprecated features for version
   */
  getDeprecatedFeatures(versionStr: string): string[] {
    const deprecated: string[] = [];

    for (const [featureName, feature] of Array.from(this.registry['featureRegistry'])) {
      if (!feature.deprecated) continue;

      const addedVersion = parseVersion(feature.addedIn);
      const requestVersion = parseVersion(versionStr);

      if (compareVersions(requestVersion, addedVersion) >= 0) {
        if (!feature.removedIn) {
          deprecated.push(featureName);
        } else {
          const removedVersion = parseVersion(feature.removedIn);
          if (compareVersions(requestVersion, removedVersion) < 0) {
            deprecated.push(featureName);
          }
        }
      }
    }

    return deprecated;
  }
}

/**
 * Version migration helper for handling API changes
 */
export class VersionMigration {
  private migrations: Map<string, (data: any) => any> = new Map();

  /**
   * Register migration from one version to another
   */
  registerMigration(fromVersion: string, toVersion: string, transform: (data: any) => any): void {
    const key = `${fromVersion}->${toVersion}`;
    this.migrations.set(key, transform);
  }

  /**
   * Migrate data from one version format to another
   */
  migrate(data: any, fromVersion: string, toVersion: string): any {
    if (fromVersion === toVersion) {
      return data;
    }

    const key = `${fromVersion}->${toVersion}`;
    const migration = this.migrations.get(key);

    if (!migration) {
      throw new Error(`No migration registered from ${fromVersion} to ${toVersion}`);
    }

    return migration(data);
  }

  /**
   * Check if migration path exists
   */
  hasMigration(fromVersion: string, toVersion: string): boolean {
    if (fromVersion === toVersion) return true;
    const key = `${fromVersion}->${toVersion}`;
    return this.migrations.has(key);
  }
}
