import {
  parseVersion,
  compareVersions,
  isVersionSupported,
  formatVersion,
  VersionRegistry,
  VersionNegotiator,
  FeatureFlagManager,
  VersionMigration,
  Version,
  VersionMetadata,
  VersionFeature,
} from '../api-versioning';

describe('API Versioning', () => {
  describe('parseVersion', () => {
    it('should parse valid semantic versions', () => {
      const version = parseVersion('1.2.3');
      expect(version.major).toBe(1);
      expect(version.minor).toBe(2);
      expect(version.patch).toBe(3);
      expect(version.prerelease).toBeUndefined();
    });

    it('should parse versions with prerelease', () => {
      const version = parseVersion('1.0.0-beta.1');
      expect(version.major).toBe(1);
      expect(version.minor).toBe(0);
      expect(version.patch).toBe(0);
      expect(version.prerelease).toBe('beta.1');
    });

    it('should parse versions with complex prerelease tags', () => {
      const version = parseVersion('2.1.0-rc.2.plus.metadata');
      expect(version.prerelease).toBe('rc.2.plus.metadata');
    });

    it('should throw on invalid version format', () => {
      expect(() => parseVersion('1.2')).toThrow('Invalid semantic version');
      expect(() => parseVersion('a.b.c')).toThrow('Invalid semantic version');
      expect(() => parseVersion('1.2.3.4')).toThrow('Invalid semantic version');
    });

    it('should throw on empty string', () => {
      expect(() => parseVersion('')).toThrow('Invalid semantic version');
    });
  });

  describe('compareVersions', () => {
    it('should compare major versions', () => {
      const v1 = parseVersion('2.0.0');
      const v2 = parseVersion('1.0.0');
      expect(compareVersions(v1, v2)).toBe(1);
      expect(compareVersions(v2, v1)).toBe(-1);
    });

    it('should compare minor versions', () => {
      const v1 = parseVersion('1.2.0');
      const v2 = parseVersion('1.1.0');
      expect(compareVersions(v1, v2)).toBe(1);
      expect(compareVersions(v2, v1)).toBe(-1);
    });

    it('should compare patch versions', () => {
      const v1 = parseVersion('1.0.5');
      const v2 = parseVersion('1.0.3');
      expect(compareVersions(v1, v2)).toBe(1);
      expect(compareVersions(v2, v1)).toBe(-1);
    });

    it('should return 0 for equal versions', () => {
      const v1 = parseVersion('1.2.3');
      const v2 = parseVersion('1.2.3');
      expect(compareVersions(v1, v2)).toBe(0);
    });

    it('should treat prerelease as less than release', () => {
      const release = parseVersion('1.0.0');
      const prerelease = parseVersion('1.0.0-beta');
      expect(compareVersions(prerelease, release)).toBe(-1);
      expect(compareVersions(release, prerelease)).toBe(1);
    });

    it('should compare prerelease versions lexicographically', () => {
      const v1 = parseVersion('1.0.0-alpha');
      const v2 = parseVersion('1.0.0-beta');
      expect(compareVersions(v1, v2)).toBe(-1);
      expect(compareVersions(v2, v1)).toBe(1);
    });

    it('should handle multiple prerelease segments', () => {
      const v1 = parseVersion('1.0.0-rc.1');
      const v2 = parseVersion('1.0.0-rc.2');
      expect(compareVersions(v1, v2)).toBe(-1);
    });
  });

  describe('formatVersion', () => {
    it('should format version without prerelease', () => {
      const version = { major: 1, minor: 2, patch: 3 };
      expect(formatVersion(version)).toBe('1.2.3');
    });

    it('should format version with prerelease', () => {
      const version = { major: 1, minor: 2, patch: 3, prerelease: 'beta.1' };
      expect(formatVersion(version)).toBe('1.2.3-beta.1');
    });

    it('should format version with zero components', () => {
      const version = { major: 0, minor: 0, patch: 0 };
      expect(formatVersion(version)).toBe('0.0.0');
    });
  });

  describe('isVersionSupported', () => {
    it('should return true for version within range', () => {
      const version = parseVersion('1.5.0');
      const min = parseVersion('1.0.0');
      const max = parseVersion('2.0.0');
      expect(isVersionSupported(version, min, max)).toBe(true);
    });

    it('should return true for version at min boundary', () => {
      const version = parseVersion('1.0.0');
      const min = parseVersion('1.0.0');
      expect(isVersionSupported(version, min)).toBe(true);
    });

    it('should return false for version below minimum', () => {
      const version = parseVersion('0.9.0');
      const min = parseVersion('1.0.0');
      expect(isVersionSupported(version, min)).toBe(false);
    });

    it('should return false for version above maximum', () => {
      const version = parseVersion('2.1.0');
      const min = parseVersion('1.0.0');
      const max = parseVersion('2.0.0');
      expect(isVersionSupported(version, min, max)).toBe(false);
    });

    it('should support optional max version', () => {
      const version = parseVersion('5.0.0');
      const min = parseVersion('1.0.0');
      expect(isVersionSupported(version, min)).toBe(true);
    });
  });

  describe('VersionRegistry', () => {
    let registry: VersionRegistry;

    beforeEach(() => {
      registry = new VersionRegistry();
    });

    it('should register version metadata', () => {
      const metadata: VersionMetadata = {
        version: '1.0.0',
        releaseDate: '2024-01-01',
        features: new Set(['feature-a', 'feature-b']),
      };
      registry.registerVersion(metadata);
      expect(registry.getVersion('1.0.0')).toBeDefined();
      expect(registry.getVersion('1.0.0')?.version).toBe('1.0.0');
    });

    it('should throw on duplicate version registration', () => {
      const metadata: VersionMetadata = {
        version: '1.0.0',
        releaseDate: '2024-01-01',
        features: new Set(['feature-a']),
      };
      registry.registerVersion(metadata);
      expect(() => registry.registerVersion(metadata)).toThrow('Version 1.0.0 already registered');
    });

    it('should register and retrieve features', () => {
      const feature: VersionFeature = {
        name: 'oauth2',
        addedIn: '1.2.0',
      };
      registry.registerFeature(feature);
      expect(registry.getFeature('oauth2')).toBeDefined();
      expect(registry.getFeature('oauth2')?.addedIn).toBe('1.2.0');
    });

    it('should check if version has feature', () => {
      const metadata: VersionMetadata = {
        version: '1.0.0',
        releaseDate: '2024-01-01',
        features: new Set(['auth', 'api']),
      };
      registry.registerVersion(metadata);
      expect(registry.hasFeature('1.0.0', 'auth')).toBe(true);
      expect(registry.hasFeature('1.0.0', 'missing')).toBe(false);
      expect(registry.hasFeature('2.0.0', 'auth')).toBe(false);
    });

    it('should list all versions', () => {
      const v1: VersionMetadata = {
        version: '1.0.0',
        releaseDate: '2024-01-01',
        features: new Set(),
      };
      const v2: VersionMetadata = {
        version: '2.0.0',
        releaseDate: '2024-06-01',
        features: new Set(),
      };
      registry.registerVersion(v1);
      registry.registerVersion(v2);
      const versions = registry.listVersions();
      expect(versions).toHaveLength(2);
    });

    it('should get latest non-deprecated version', () => {
      registry.registerVersion({
        version: '1.0.0',
        releaseDate: '2024-01-01',
        features: new Set(),
      });
      registry.registerVersion({
        version: '2.0.0',
        releaseDate: '2024-06-01',
        features: new Set(),
      });
      registry.registerVersion({
        version: '3.0.0',
        releaseDate: '2024-12-01',
        features: new Set(),
      });
      const latest = registry.getLatestVersion();
      expect(latest?.version).toBe('3.0.0');
    });

    it('should skip deprecated versions when finding latest', () => {
      registry.registerVersion({
        version: '1.0.0',
        releaseDate: '2024-01-01',
        features: new Set(),
        deprecated: true,
      });
      registry.registerVersion({
        version: '2.0.0',
        releaseDate: '2024-06-01',
        features: new Set(),
      });
      const latest = registry.getLatestVersion();
      expect(latest?.version).toBe('2.0.0');
    });

    it('should get supported versions excluding expired', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      registry.registerVersion({
        version: '1.0.0',
        releaseDate: '2024-01-01',
        features: new Set(),
        deprecated: true,
        sunsetDate: pastDate.toISOString(),
      });
      registry.registerVersion({
        version: '2.0.0',
        releaseDate: '2024-06-01',
        features: new Set(),
        deprecated: true,
        sunsetDate: futureDate.toISOString(),
      });
      registry.registerVersion({
        version: '3.0.0',
        releaseDate: '2024-12-01',
        features: new Set(),
      });

      const supported = registry.getSupportedVersions();
      const versions = supported.map((v) => v.version);
      expect(versions).toContain('2.0.0');
      expect(versions).toContain('3.0.0');
      expect(versions).not.toContain('1.0.0');
    });

    it('should get deprecated versions', () => {
      registry.registerVersion({
        version: '1.0.0',
        releaseDate: '2024-01-01',
        features: new Set(),
        deprecated: true,
      });
      registry.registerVersion({
        version: '2.0.0',
        releaseDate: '2024-06-01',
        features: new Set(),
      });

      const deprecated = registry.getDeprecatedVersions();
      expect(deprecated).toHaveLength(1);
      expect(deprecated[0].version).toBe('1.0.0');
    });

    it('should check if version is active', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      registry.registerVersion({
        version: '1.0.0',
        releaseDate: '2024-01-01',
        features: new Set(),
        sunsetDate: futureDate.toISOString(),
      });
      registry.registerVersion({
        version: '2.0.0',
        releaseDate: '2024-06-01',
        features: new Set(),
      });

      expect(registry.isActive('1.0.0')).toBe(true);
      expect(registry.isActive('2.0.0')).toBe(true);
      expect(registry.isActive('3.0.0')).toBe(false);
    });

    it('should return false for active check on past sunset date', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      registry.registerVersion({
        version: '1.0.0',
        releaseDate: '2024-01-01',
        features: new Set(),
        sunsetDate: pastDate.toISOString(),
      });

      expect(registry.isActive('1.0.0')).toBe(false);
    });
  });

  describe('VersionNegotiator', () => {
    let registry: VersionRegistry;
    let negotiator: VersionNegotiator;

    beforeEach(() => {
      registry = new VersionRegistry();
      registry.registerVersion({
        version: '1.0.0',
        releaseDate: '2024-01-01',
        features: new Set(),
      });
      registry.registerVersion({
        version: '2.0.0',
        releaseDate: '2024-06-01',
        features: new Set(),
      });
      negotiator = new VersionNegotiator(registry);
    });

    it('should negotiate version from header', () => {
      const result = negotiator.negotiateVersion({
        headers: { 'api-version': '2.0.0' },
      });
      expect(result.version).toBe('2.0.0');
      expect(result.source).toBe('header');
    });

    it('should negotiate version from URL path', () => {
      const result = negotiator.negotiateVersion({
        path: '/api/v2.0.0/endpoint',
      });
      expect(result.version).toBe('2.0.0');
      expect(result.source).toBe('url');
    });

    it('should negotiate version from query parameter', () => {
      const result = negotiator.negotiateVersion({
        query: { version: '1.0.0' },
      });
      expect(result.version).toBe('1.0.0');
      expect(result.source).toBe('query');
    });

    it('should use default version when no source matches', () => {
      const result = negotiator.negotiateVersion({});
      expect(result.version).toBe('1.0.0');
      expect(result.source).toBe('default');
    });

    it('should use latest when preferLatest is enabled', () => {
      const negotiatorLatest = new VersionNegotiator(registry, {
        preferLatest: true,
      });
      const result = negotiatorLatest.negotiateVersion({});
      expect(result.version).toBe('2.0.0');
      expect(result.source).toBe('default');
    });

    it('should respect header name configuration', () => {
      const customNegotiator = new VersionNegotiator(registry, {
        headerName: 'x-api-version',
      });
      const result = customNegotiator.negotiateVersion({
        headers: { 'x-api-version': '2.0.0' },
      });
      expect(result.version).toBe('2.0.0');
    });

    it('should be case insensitive for header matching', () => {
      const result = negotiator.negotiateVersion({
        headers: { 'API-Version': '2.0.0' },
      });
      expect(result.version).toBe('2.0.0');
    });

    it('should prioritize header over query parameter', () => {
      const result = negotiator.negotiateVersion({
        headers: { 'api-version': '2.0.0' },
        query: { version: '1.0.0' },
      });
      expect(result.version).toBe('2.0.0');
      expect(result.source).toBe('header');
    });

    it('should only negotiate unsupported versions to default', () => {
      const result = negotiator.negotiateVersion({
        headers: { 'api-version': '999.0.0' },
      });
      expect(result.version).toBe('1.0.0');
      expect(result.source).toBe('default');
    });

    it('should handle version in format like v1.2.3 in URL', () => {
      const result = negotiator.negotiateVersion({
        path: '/api/v1/endpoint',
      });
      expect(result.version).toBe('1.0.0');
    });
  });

  describe('FeatureFlagManager', () => {
    let registry: VersionRegistry;
    let manager: FeatureFlagManager;

    beforeEach(() => {
      registry = new VersionRegistry();
      registry.registerVersion({
        version: '1.0.0',
        releaseDate: '2024-01-01',
        features: new Set(['auth', 'api']),
      });
      registry.registerVersion({
        version: '2.0.0',
        releaseDate: '2024-06-01',
        features: new Set(['auth', 'api', 'webhooks']),
      });
      manager = new FeatureFlagManager(registry);
    });

    it('should check feature availability', () => {
      expect(manager.isFeatureAvailable('1.0.0', 'auth')).toBe(true);
      expect(manager.isFeatureAvailable('1.0.0', 'webhooks')).toBe(false);
      expect(manager.isFeatureAvailable('2.0.0', 'webhooks')).toBe(true);
    });

    it('should override feature availability', () => {
      manager.overrideFeature('1.0.0', 'webhooks');
      expect(manager.isFeatureAvailable('1.0.0', 'webhooks')).toBe(true);
    });

    it('should get available features for version', () => {
      const features = manager.getAvailableFeatures('1.0.0');
      expect(features).toContain('auth');
      expect(features).toContain('api');
      expect(features).not.toContain('webhooks');
    });

    it('should include overridden features in available list', () => {
      manager.overrideFeature('1.0.0', 'webhooks');
      const features = manager.getAvailableFeatures('1.0.0');
      expect(features).toContain('webhooks');
    });

    it('should not duplicate features when getting available list', () => {
      manager.overrideFeature('2.0.0', 'webhooks');
      const features = manager.getAvailableFeatures('2.0.0');
      const webhooksCount = features.filter((f) => f === 'webhooks').length;
      expect(webhooksCount).toBe(1);
    });

    it('should get deprecated features for version', () => {
      registry.registerFeature({
        name: 'old-api',
        addedIn: '1.0.0',
        removedIn: '2.0.0',
        deprecated: true,
        deprecatedIn: '1.5.0',
      });

      const deprecated = manager.getDeprecatedFeatures('1.8.0');
      expect(deprecated).toContain('old-api');
    });

    it('should handle features deprecated but not removed', () => {
      registry.registerFeature({
        name: 'legacy-auth',
        addedIn: '1.0.0',
        deprecated: true,
        deprecatedIn: '2.0.0',
      });

      const deprecated = manager.getDeprecatedFeatures('2.5.0');
      expect(deprecated).toContain('legacy-auth');
    });

    it('should not include removed features in deprecated list', () => {
      registry.registerFeature({
        name: 'removed-feature',
        addedIn: '1.0.0',
        removedIn: '1.5.0',
        deprecated: true,
        deprecatedIn: '1.0.0',
      });

      const deprecated = manager.getDeprecatedFeatures('2.0.0');
      expect(deprecated).not.toContain('removed-feature');
    });

    it('should return empty list for unknown version', () => {
      const features = manager.getAvailableFeatures('999.0.0');
      expect(features).toEqual([]);
    });
  });

  describe('VersionMigration', () => {
    let migration: VersionMigration;

    beforeEach(() => {
      migration = new VersionMigration();
    });

    it('should register migration from one version to another', () => {
      const transform = (data: any) => ({ ...data, apiVersion: '2.0.0' });
      migration.registerMigration('1.0.0', '2.0.0', transform);
      expect(migration.hasMigration('1.0.0', '2.0.0')).toBe(true);
    });

    it('should migrate data using registered transform', () => {
      const transform = (data: any) => ({
        ...data,
        userId: data.user_id,
        user_id: undefined,
      });
      migration.registerMigration('1.0.0', '2.0.0', transform);

      const result = migration.migrate({ user_id: '123', name: 'John' }, '1.0.0', '2.0.0');
      expect(result.userId).toBe('123');
      expect(result.user_id).toBeUndefined();
      expect(result.name).toBe('John');
    });

    it('should return data unchanged when versions are same', () => {
      const data = { id: '1', name: 'Test' };
      const result = migration.migrate(data, '1.0.0', '1.0.0');
      expect(result).toEqual(data);
    });

    it('should throw when no migration path exists', () => {
      expect(() => migration.migrate({ id: '1' }, '1.0.0', '2.0.0')).toThrow(
        'No migration registered from 1.0.0 to 2.0.0'
      );
    });

    it('should support chained migrations', () => {
      const transform1 = (data: any) => ({ ...data, v: 2 });
      const transform2 = (data: any) => ({ ...data, v: 3 });

      migration.registerMigration('1.0.0', '2.0.0', transform1);
      migration.registerMigration('2.0.0', '3.0.0', transform2);

      const step1 = migration.migrate({ v: 1 }, '1.0.0', '2.0.0');
      expect(step1.v).toBe(2);

      const step2 = migration.migrate(step1, '2.0.0', '3.0.0');
      expect(step2.v).toBe(3);
    });

    it('should check migration existence', () => {
      migration.registerMigration('1.0.0', '2.0.0', (d) => d);
      expect(migration.hasMigration('1.0.0', '2.0.0')).toBe(true);
      expect(migration.hasMigration('2.0.0', '3.0.0')).toBe(false);
      expect(migration.hasMigration('1.0.0', '1.0.0')).toBe(true);
    });

    it('should handle complex data transformations', () => {
      const transform = (data: any) => ({
        metadata: {
          userId: data.user_id,
          createdAt: new Date(data.created).toISOString(),
        },
        payload: data.data,
      });

      migration.registerMigration('1.0.0', '2.0.0', transform);
      const result = migration.migrate(
        { user_id: '123', created: '2024-01-01', data: { value: 'test' } },
        '1.0.0',
        '2.0.0'
      );

      expect(result.metadata.userId).toBe('123');
      expect(result.payload.value).toBe('test');
    });

    it('should support array transformations', () => {
      const transform = (data: any) => ({
        items: data.items.map((item: any) => ({
          id: item.id,
          name: item.title,
        })),
      });

      migration.registerMigration('1.0.0', '2.0.0', transform);
      const result = migration.migrate(
        {
          items: [
            { id: '1', title: 'Item 1' },
            { id: '2', title: 'Item 2' },
          ],
        },
        '1.0.0',
        '2.0.0'
      );

      expect(result.items).toHaveLength(2);
      expect(result.items[0].name).toBe('Item 1');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete version negotiation flow', () => {
      const registry = new VersionRegistry();
      registry.registerVersion({
        version: '1.0.0',
        releaseDate: '2024-01-01',
        features: new Set(['basic']),
      });
      registry.registerVersion({
        version: '2.0.0',
        releaseDate: '2024-06-01',
        features: new Set(['basic', 'advanced']),
      });

      const negotiator = new VersionNegotiator(registry);
      const result = negotiator.negotiateVersion({
        headers: { 'api-version': '2.0.0' },
      });

      const manager = new FeatureFlagManager(registry);
      const hasAdvanced = manager.isFeatureAvailable(result.version, 'advanced');

      expect(hasAdvanced).toBe(true);
    });

    it('should handle version deprecation and migration', () => {
      const registry = new VersionRegistry();
      registry.registerVersion({
        version: '1.0.0',
        releaseDate: '2024-01-01',
        features: new Set(),
        deprecated: true,
      });
      registry.registerVersion({
        version: '2.0.0',
        releaseDate: '2024-06-01',
        features: new Set(),
      });

      const migration = new VersionMigration();
      migration.registerMigration('1.0.0', '2.0.0', (data) => ({
        ...data,
        version: '2.0.0',
      }));

      const oldData = { id: '1', version: '1.0.0' };
      const newData = migration.migrate(oldData, '1.0.0', '2.0.0');

      expect(newData.version).toBe('2.0.0');
      expect(registry.isActive('1.0.0')).toBe(true);
    });

    it('should enforce feature availability across version transitions', () => {
      const registry = new VersionRegistry();
      registry.registerVersion({
        version: '1.0.0',
        releaseDate: '2024-01-01',
        features: new Set(['feature-a']),
      });
      registry.registerVersion({
        version: '2.0.0',
        releaseDate: '2024-06-01',
        features: new Set(['feature-a', 'feature-b']),
      });

      const manager = new FeatureFlagManager(registry);
      expect(manager.isFeatureAvailable('1.0.0', 'feature-b')).toBe(false);
      expect(manager.isFeatureAvailable('2.0.0', 'feature-b')).toBe(true);

      manager.overrideFeature('1.0.0', 'feature-b');
      expect(manager.isFeatureAvailable('1.0.0', 'feature-b')).toBe(true);
    });
  });
});
