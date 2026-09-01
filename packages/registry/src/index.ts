import crypto from 'crypto';

export type AdvisorySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface PackageRelease {
  name: string;
  version: string;
  publisherDid: string;
  description: string;
  tarballHash: string; // SHA-256
  sizeBytes: number;
  dependencies: Record<string, string>;
  slsaAttestationId?: string;
  manifestMerkleRoot: string;
  publisherSignature: string;
  publishedAt: string;
  deprecated: boolean;
  deprecationReason?: string;
  downloadsCount: number;
}

export interface PackageMetadata {
  name: string;
  description: string;
  latestVersion: string;
  maintainers: string[];
  versions: Record<string, PackageRelease>;
  totalDownloads: number;
  createdAt: string;
  updatedAt: string;
}

export interface VulnerabilityAdvisory {
  advisoryId: string;
  packageName: string;
  affectedVersions: string[];
  severity: AdvisorySeverity;
  title: string;
  description: string;
  reportedBy: string;
  reportedAt: string;
  patchedIn?: string;
  signature: string;
}

export interface RegistryStats {
  totalPackages: number;
  totalReleases: number;
  totalDownloads: number;
  totalAdvisories: number;
  verifiedPackagesRatio: number;
}

export class OceanicosRegistryEngine {
  private packages: Map<string, PackageMetadata> = new Map();
  private advisories: Map<string, VulnerabilityAdvisory> = new Map();
  private signingKey: string;

  constructor(signingKey = 'omega-v-registry-secret-key') {
    this.signingKey = signingKey;
    this.seedCanonicalPackages();
  }

  private seedCanonicalPackages(): void {
    this.publishPackage({
      name: '@omega-v/core-kernel',
      version: '6.0.0',
      publisherDid: 'did:omega:core:genesis-builder',
      description: 'The definitive Ω∞v Oceanicos deterministic verification & execution kernel',
      tarballContent: Buffer.from('Ω∞v::CORE_KERNEL_BYTECODE_V6'),
      dependencies: { '@omega-v/types': '^0.1.0' },
      slsaAttestationId: 'att-build-genesis-001',
    });

    this.publishPackage({
      name: '@omega-v/vm-runtime',
      version: '1.2.0',
      publisherDid: 'did:omega:core:genesis-builder',
      description: 'Isolated bytecode virtual machine and sandboxed evaluator',
      tarballContent: Buffer.from('Ω∞v::VM_RUNTIME_BYTECODE_V1.2'),
      dependencies: { '@omega-v/types': '^0.1.0' },
      slsaAttestationId: 'att-build-genesis-002',
    });
  }

  public publishPackage(spec: {
    name: string;
    version: string;
    publisherDid: string;
    description: string;
    tarballContent: Buffer | string;
    dependencies?: Record<string, string>;
    slsaAttestationId?: string;
  }): PackageRelease {
    const rawContent = Buffer.isBuffer(spec.tarballContent)
      ? spec.tarballContent
      : Buffer.from(spec.tarballContent);

    const tarballHash = crypto.createHash('sha256').update(rawContent).digest('hex');
    const sizeBytes = rawContent.length;

    // Compute Merkle root of manifest
    const manifestLeaves = [
      crypto.createHash('sha256').update(spec.name).digest('hex'),
      crypto.createHash('sha256').update(spec.version).digest('hex'),
      tarballHash,
      crypto.createHash('sha256').update(JSON.stringify(spec.dependencies || {})).digest('hex'),
    ];

    const manifestMerkleRoot = this.computeMerkleRoot(manifestLeaves);

    const publishedAt = new Date().toISOString();
    const sigPayload = `${spec.name}:${spec.version}:${spec.publisherDid}:${tarballHash}:${manifestMerkleRoot}`;
    const publisherSignature =
      '0x' + crypto.createHmac('sha256', this.signingKey).update(sigPayload).digest('hex');

    const release: PackageRelease = {
      name: spec.name,
      version: spec.version,
      publisherDid: spec.publisherDid,
      description: spec.description,
      tarballHash,
      sizeBytes,
      dependencies: spec.dependencies || {},
      slsaAttestationId: spec.slsaAttestationId,
      manifestMerkleRoot,
      publisherSignature,
      publishedAt,
      deprecated: false,
      downloadsCount: 0,
    };

    let pkg = this.packages.get(spec.name);
    if (!pkg) {
      pkg = {
        name: spec.name,
        description: spec.description,
        latestVersion: spec.version,
        maintainers: [spec.publisherDid],
        versions: {},
        totalDownloads: 0,
        createdAt: publishedAt,
        updatedAt: publishedAt,
      };
      this.packages.set(spec.name, pkg);
    } else {
      pkg.latestVersion = spec.version;
      pkg.description = spec.description;
      pkg.updatedAt = publishedAt;
      if (!pkg.maintainers.includes(spec.publisherDid)) {
        pkg.maintainers.push(spec.publisherDid);
      }
    }

    pkg.versions[spec.version] = release;
    return release;
  }

  public getPackage(name: string): PackageMetadata | undefined {
    return this.packages.get(name);
  }

  public getPackageVersion(name: string, version: string): PackageRelease | undefined {
    const pkg = this.packages.get(name);
    if (!pkg) return undefined;
    return pkg.versions[version];
  }

  public getAllPackages(): PackageMetadata[] {
    return Array.from(this.packages.values());
  }

  public verifyPackageIntegrity(
    name: string,
    version: string,
    tarballContent: Buffer | string
  ): { valid: boolean; tarballHash: string; matchesExpected: boolean; signatureValid: boolean } {
    const release = this.getPackageVersion(name, version);
    if (!release) {
      return { valid: false, tarballHash: '', matchesExpected: false, signatureValid: false };
    }

    const rawContent = Buffer.isBuffer(tarballContent)
      ? tarballContent
      : Buffer.from(tarballContent);

    const actualHash = crypto.createHash('sha256').update(rawContent).digest('hex');
    const matchesExpected = actualHash === release.tarballHash;

    const sigPayload = `${release.name}:${release.version}:${release.publisherDid}:${release.tarballHash}:${release.manifestMerkleRoot}`;
    const expectedSig =
      '0x' + crypto.createHmac('sha256', this.signingKey).update(sigPayload).digest('hex');
    const signatureValid = release.publisherSignature === expectedSig;

    const valid = matchesExpected && signatureValid;

    if (valid) {
      release.downloadsCount++;
      const pkg = this.packages.get(name);
      if (pkg) pkg.totalDownloads++;
    }

    return {
      valid,
      tarballHash: actualHash,
      matchesExpected,
      signatureValid,
    };
  }

  public deprecatePackage(
    name: string,
    version: string,
    reason: string
  ): PackageRelease {
    const release = this.getPackageVersion(name, version);
    if (!release) throw new Error(`Package '${name}@${version}' not found`);

    release.deprecated = true;
    release.deprecationReason = reason;

    const pkg = this.packages.get(name);
    if (pkg) pkg.updatedAt = new Date().toISOString();

    return release;
  }

  public publishAdvisory(spec: {
    packageName: string;
    affectedVersions: string[];
    severity: AdvisorySeverity;
    title: string;
    description: string;
    reportedBy: string;
    patchedIn?: string;
  }): VulnerabilityAdvisory {
    const advisoryId = `adv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const reportedAt = new Date().toISOString();

    const sigPayload = `${advisoryId}:${spec.packageName}:${spec.severity}:${reportedAt}`;
    const signature =
      '0x' + crypto.createHmac('sha256', this.signingKey).update(sigPayload).digest('hex');

    const advisory: VulnerabilityAdvisory = {
      advisoryId,
      packageName: spec.packageName,
      affectedVersions: spec.affectedVersions,
      severity: spec.severity,
      title: spec.title,
      description: spec.description,
      reportedBy: spec.reportedBy,
      reportedAt,
      patchedIn: spec.patchedIn,
      signature,
    };

    this.advisories.set(advisoryId, advisory);
    return advisory;
  }

  public getAdvisories(packageName?: string): VulnerabilityAdvisory[] {
    const all = Array.from(this.advisories.values());
    if (packageName) {
      return all.filter((a) => a.packageName === packageName);
    }
    return all;
  }

  public getStats(): RegistryStats {
    const pkgs = Array.from(this.packages.values());
    let totalReleases = 0;
    let totalDownloads = 0;

    for (const p of pkgs) {
      totalReleases += Object.keys(p.versions).length;
      totalDownloads += p.totalDownloads;
    }

    return {
      totalPackages: pkgs.length,
      totalReleases,
      totalDownloads,
      totalAdvisories: this.advisories.size,
      verifiedPackagesRatio: 1.0,
    };
  }

  private computeMerkleRoot(leaves: string[]): string {
    let currentLevel = leaves;
    while (currentLevel.length > 1) {
      if (currentLevel.length % 2 !== 0) {
        currentLevel.push(currentLevel[currentLevel.length - 1]);
      }
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const combined = currentLevel[i] + currentLevel[i + 1];
        nextLevel.push(crypto.createHash('sha256').update(combined).digest('hex'));
      }
      currentLevel = nextLevel;
    }
    return currentLevel[0] || '0x0000000000000000000000000000000000000000000000000000000000000000';
  }
}

export default OceanicosRegistryEngine;
