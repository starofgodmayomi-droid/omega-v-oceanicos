import { OceanicosRegistryEngine } from '../index';

describe('OceanicosRegistryEngine — Decentralized Verifiable Package & Artifact Registry', () => {
  let registry: OceanicosRegistryEngine;

  beforeEach(() => {
    registry = new OceanicosRegistryEngine('test-registry-key');
  });

  describe('1. Canonical Package Seeding & Querying', () => {
    it('should seed canonical core packages on initialization', () => {
      const pkgs = registry.getAllPackages();
      expect(pkgs.length).toBeGreaterThanOrEqual(2);
      expect(pkgs.map((p) => p.name)).toContain('@omega-v/core-kernel');
    });

    it('should query specific package version metadata', () => {
      const release = registry.getPackageVersion('@omega-v/core-kernel', '6.0.0');
      expect(release).toBeDefined();
      expect(release!.version).toBe('6.0.0');
      expect(release!.tarballHash).toHaveLength(64);
      expect(release!.manifestMerkleRoot).toHaveLength(64);
      expect(release!.publisherSignature).toMatch(/^0x/);
    });
  });

  describe('2. Package Publishing & Manifest Merkle Roots', () => {
    it('should publish a signed package release with SHA-256 tarball hash and Merkle root', () => {
      const release = registry.publishPackage({
        name: '@omega-v/neural-adapter',
        version: '1.0.0',
        publisherDid: 'did:omega:developer:alice',
        description: 'Neural weight matrix verification adapter',
        tarballContent: Buffer.from('MODEL_ADAPTER_WEIGHT_V1'),
        dependencies: { '@omega-v/types': '^0.1.0' },
        slsaAttestationId: 'att-slsa-neural-001',
      });

      expect(release.name).toBe('@omega-v/neural-adapter');
      expect(release.version).toBe('1.0.0');
      expect(release.tarballHash).toHaveLength(64);
      expect(release.manifestMerkleRoot).toHaveLength(64);
      expect(release.publisherSignature).toMatch(/^0x/);

      const pkg = registry.getPackage('@omega-v/neural-adapter');
      expect(pkg).toBeDefined();
      expect(pkg!.latestVersion).toBe('1.0.0');
      expect(pkg!.maintainers).toContain('did:omega:developer:alice');
    });
  });

  describe('3. Zero-Trust Package Integrity Verification', () => {
    it('should verify matching tarball content checksum and publisher signature', () => {
      const content = Buffer.from('BINARY_PAYLOAD_TEST_V1');
      registry.publishPackage({
        name: '@omega-v/test-pkg',
        version: '0.1.0',
        publisherDid: 'did:omega:publisher:bob',
        description: 'Test integrity package',
        tarballContent: content,
      });

      // Valid download verification
      const verifyResult = registry.verifyPackageIntegrity('@omega-v/test-pkg', '0.1.0', content);
      expect(verifyResult.valid).toBe(true);
      expect(verifyResult.matchesExpected).toBe(true);
      expect(verifyResult.signatureValid).toBe(true);

      // Tampered download fails
      const tamperedContent = Buffer.from('TAMPERED_PAYLOAD_ATTACK');
      const tamperedResult = registry.verifyPackageIntegrity('@omega-v/test-pkg', '0.1.0', tamperedContent);
      expect(tamperedResult.valid).toBe(false);
      expect(tamperedResult.matchesExpected).toBe(false);
    });
  });

  describe('4. Package Deprecation & Vulnerability Advisories', () => {
    it('should deprecate vulnerable package versions with audit reason', () => {
      const release = registry.deprecatePackage('@omega-v/core-kernel', '6.0.0', 'Legacy VM instructions replaced by v6.1');
      expect(release.deprecated).toBe(true);
      expect(release.deprecationReason).toContain('Legacy VM');
    });

    it('should publish and query security vulnerability advisories', () => {
      const advisory = registry.publishAdvisory({
        packageName: '@omega-v/vm-runtime',
        affectedVersions: ['<1.2.0'],
        severity: 'HIGH',
        title: 'Stack Overflow in Recursive IR Evaluation',
        description: 'Deeply nested IR expressions could exceed call stack limits without gas exhaustion',
        reportedBy: 'did:omega:auditor:sentinel-01',
        patchedIn: '1.2.0',
      });

      expect(advisory.advisoryId).toMatch(/^adv-/);
      expect(advisory.severity).toBe('HIGH');
      expect(advisory.signature).toMatch(/^0x/);

      const pkgAdvisories = registry.getAdvisories('@omega-v/vm-runtime');
      expect(pkgAdvisories.length).toBeGreaterThanOrEqual(1);
    });

    it('should compute registry statistics', () => {
      const stats = registry.getStats();
      expect(stats.totalPackages).toBeGreaterThanOrEqual(2);
      expect(stats.totalReleases).toBeGreaterThanOrEqual(2);
      expect(stats.verifiedPackagesRatio).toBe(1.0);
    });
  });
});
