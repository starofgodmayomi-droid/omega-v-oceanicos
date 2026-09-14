import crypto from 'crypto';

export type EnclaveType = 'INTEL_SGX' | 'AMD_SEV' | 'AWS_NITRO' | 'ARM_TRUSTZONE' | 'EMULATED_TEE';
export type EnclaveStatus = 'INITIALIZING' | 'READY' | 'EXECUTING' | 'TERMINATED';

export interface EnclaveInstance {
  enclaveId: string;
  type: EnclaveType;
  name: string;
  mrEnclave: string; // SHA-256 code/memory measurement
  mrSigner: string; // SHA-256 author/publisher measurement
  pcrValues: {
    pcr0: string; // Boot measurement
    pcr1: string; // Host configuration
    pcr2: string; // Runtime application measurement
  };
  status: EnclaveStatus;
  sealedDataCount: number;
  createdAt: string;
}

export interface RemoteAttestationReport {
  reportId: string;
  enclaveId: string;
  type: EnclaveType;
  mrEnclave: string;
  mrSigner: string;
  userDataHash: string;
  hardwareNonce: string;
  pcr0: string;
  pcr1: string;
  pcr2: string;
  certificateChain: string[];
  hardwareSignature: string;
  issuedAt: string;
  expiresAt: string;
}

export interface SealedState {
  sealId: string;
  enclaveId: string;
  mrEnclaveConstraint: string;
  ciphertext: string; // Base64 AES-256-GCM
  iv: string; // Hex
  authTag: string; // Hex
  sealedAt: string;
}

export interface EnclaveExecutionResult {
  executionId: string;
  enclaveId: string;
  output: Record<string, unknown>;
  executionTimeMs: number;
  attestationReport: RemoteAttestationReport;
  verified: boolean;
}

export interface EnclaveStats {
  totalEnclaves: number;
  readyEnclaves: number;
  totalAttestations: number;
  totalSealedObjects: number;
  supportedTypes: EnclaveType[];
}

export class OceanicosEnclaveEngine {
  private enclaves: Map<string, EnclaveInstance> = new Map();
  private sealedObjects: Map<string, SealedState> = new Map();
  private reports: Map<string, RemoteAttestationReport> = new Map();
  private masterSealingKey: Buffer;
  private hardwareRootKey: string;

  constructor(hardwareRootKey = 'omega-v-root-hardware-key') {
    this.hardwareRootKey = hardwareRootKey;
    this.masterSealingKey = crypto
      .createHash('sha256')
      .update(hardwareRootKey + ':sealing')
      .digest();
    this.seedCanonicalEnclaves();
  }

  private seedCanonicalEnclaves(): void {
    this.provisionEnclave({
      enclaveId: 'enclave-sgx-primary-01',
      type: 'INTEL_SGX',
      name: 'Primary SGX Secure Execution Core',
      codePayload: 'Ω∞v::SGX_DETERMINISTIC_VERIFIER_RUNTIME_V6',
      authorSignerKey: 'did:omega:author:genesis-root',
    });

    this.provisionEnclave({
      enclaveId: 'enclave-nitro-isolated-02',
      type: 'AWS_NITRO',
      name: 'Nitro Hardware Isolated Crypto Vault',
      codePayload: 'Ω∞v::NITRO_KEY_VAULT_RUNTIME_V1',
      authorSignerKey: 'did:omega:author:genesis-root',
    });
  }

  public provisionEnclave(spec: {
    enclaveId?: string;
    type: EnclaveType;
    name: string;
    codePayload: string;
    authorSignerKey: string;
  }): EnclaveInstance {
    const enclaveId =
      spec.enclaveId ||
      `enclave-${spec.type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // MRENCLAVE: cryptographic measurement of the loaded code payload
    const mrEnclave = crypto.createHash('sha256').update(spec.codePayload).digest('hex');

    // MRSIGNER: cryptographic measurement of the author key
    const mrSigner = crypto.createHash('sha256').update(spec.authorSignerKey).digest('hex');

    // Synthetic Platform Configuration Registers (PCRs)
    const pcr0 = crypto.createHash('sha256').update(`BOOT:${spec.type}`).digest('hex');
    const pcr1 = crypto.createHash('sha256').update(`HOST:${spec.name}`).digest('hex');
    const pcr2 = crypto.createHash('sha256').update(`APP:${mrEnclave}:${mrSigner}`).digest('hex');

    const enclave: EnclaveInstance = {
      enclaveId,
      type: spec.type,
      name: spec.name,
      mrEnclave,
      mrSigner,
      pcrValues: { pcr0, pcr1, pcr2 },
      status: 'READY',
      sealedDataCount: 0,
      createdAt: new Date().toISOString(),
    };

    this.enclaves.set(enclaveId, enclave);
    return enclave;
  }

  public generateRemoteAttestation(
    enclaveId: string,
    userData: Record<string, unknown> | string,
    hardwareNonce?: string
  ): RemoteAttestationReport {
    const enclave = this.enclaves.get(enclaveId);
    if (!enclave) throw new Error(`Enclave '${enclaveId}' not found`);

    const reportId = `att-rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nonce = hardwareNonce || crypto.randomBytes(16).toString('hex');
    const userDataStr = typeof userData === 'string' ? userData : JSON.stringify(userData);
    const userDataHash = crypto.createHash('sha256').update(userDataStr).digest('hex');

    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour validity

    // Hardware signature over measurement tuple + nonce + user data hash
    const sigPayload = `${reportId}:${enclaveId}:${enclave.type}:${enclave.mrEnclave}:${enclave.mrSigner}:${userDataHash}:${nonce}:${enclave.pcrValues.pcr0}:${enclave.pcrValues.pcr1}:${enclave.pcrValues.pcr2}`;
    const hardwareSignature =
      '0x' + crypto.createHmac('sha256', this.hardwareRootKey).update(sigPayload).digest('hex');

    const report: RemoteAttestationReport = {
      reportId,
      enclaveId,
      type: enclave.type,
      mrEnclave: enclave.mrEnclave,
      mrSigner: enclave.mrSigner,
      userDataHash,
      hardwareNonce: nonce,
      pcr0: enclave.pcrValues.pcr0,
      pcr1: enclave.pcrValues.pcr1,
      pcr2: enclave.pcrValues.pcr2,
      certificateChain: [
        `cert:root:omega-hardware-ca`,
        `cert:intermediate:${enclave.type.toLowerCase()}-pck`,
        `cert:leaf:${enclaveId}`,
      ],
      hardwareSignature,
      issuedAt,
      expiresAt,
    };

    this.reports.set(reportId, report);
    return report;
  }

  public verifyRemoteAttestation(report: RemoteAttestationReport): {
    valid: boolean;
    trusted: boolean;
    reason?: string;
  } {
    // Check expiry
    if (new Date(report.expiresAt) < new Date()) {
      return { valid: false, trusted: false, reason: 'Remote attestation report has expired' };
    }

    // Verify hardware signature
    const sigPayload = `${report.reportId}:${report.enclaveId}:${report.type}:${report.mrEnclave}:${report.mrSigner}:${report.userDataHash}:${report.hardwareNonce}:${report.pcr0}:${report.pcr1}:${report.pcr2}`;
    const expectedSig =
      '0x' + crypto.createHmac('sha256', this.hardwareRootKey).update(sigPayload).digest('hex');

    if (report.hardwareSignature !== expectedSig) {
      return { valid: false, trusted: false, reason: 'Invalid hardware signature' };
    }

    return { valid: true, trusted: true };
  }

  public sealData(enclaveId: string, plaintext: string | Record<string, unknown>): SealedState {
    const enclave = this.enclaves.get(enclaveId);
    if (!enclave) throw new Error(`Enclave '${enclaveId}' not found`);

    const sealId = `seal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const text = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);

    // Derive sealing key bound to mrEnclave
    const derivedKey = crypto
      .createHmac('sha256', this.masterSealingKey)
      .update(enclave.mrEnclave)
      .digest();

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
    let ciphertext = cipher.update(text, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('hex');

    const sealed: SealedState = {
      sealId,
      enclaveId,
      mrEnclaveConstraint: enclave.mrEnclave,
      ciphertext,
      iv: iv.toString('hex'),
      authTag,
      sealedAt: new Date().toISOString(),
    };

    this.sealedObjects.set(sealId, sealed);
    enclave.sealedDataCount++;
    return sealed;
  }

  public unsealData(enclaveId: string, sealed: SealedState): string {
    const enclave = this.enclaves.get(enclaveId);
    if (!enclave) throw new Error(`Enclave '${enclaveId}' not found`);

    if (enclave.mrEnclave !== sealed.mrEnclaveConstraint) {
      throw new Error(
        `Unsealing rejected: MRENCLAVE mismatch (expected ${sealed.mrEnclaveConstraint}, got ${enclave.mrEnclave})`
      );
    }

    const derivedKey = crypto
      .createHmac('sha256', this.masterSealingKey)
      .update(enclave.mrEnclave)
      .digest();

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      derivedKey,
      Buffer.from(sealed.iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(sealed.authTag, 'hex'));
    let decrypted = decipher.update(sealed.ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  public executeConfidentialCode(
    enclaveId: string,
    operationName: string,
    inputs: Record<string, unknown>
  ): EnclaveExecutionResult {
    const enclave = this.enclaves.get(enclaveId);
    if (!enclave) throw new Error(`Enclave '${enclaveId}' not found`);

    enclave.status = 'EXECUTING';
    const startTime = Date.now();

    // Deterministic confidential execution simulation
    const output: Record<string, unknown> = {
      operation: operationName,
      executedInEnclave: enclaveId,
      type: enclave.type,
      inputsHash: crypto.createHash('sha256').update(JSON.stringify(inputs)).digest('hex'),
      resultVerified: true,
      timestamp: new Date().toISOString(),
    };

    const executionTimeMs = Math.max(1, Date.now() - startTime);
    enclave.status = 'READY';

    // Generate Remote Attestation for this execution
    const attestationReport = this.generateRemoteAttestation(enclaveId, output);

    return {
      executionId: `exec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      enclaveId,
      output,
      executionTimeMs,
      attestationReport,
      verified: true,
    };
  }

  public getEnclaves(): EnclaveInstance[] {
    return Array.from(this.enclaves.values());
  }

  public getReports(): RemoteAttestationReport[] {
    return Array.from(this.reports.values());
  }

  public getStats(): EnclaveStats {
    const enclaves = Array.from(this.enclaves.values());
    return {
      totalEnclaves: enclaves.length,
      readyEnclaves: enclaves.filter((e) => e.status === 'READY').length,
      totalAttestations: this.reports.size,
      totalSealedObjects: this.sealedObjects.size,
      supportedTypes: ['INTEL_SGX', 'AMD_SEV', 'AWS_NITRO', 'ARM_TRUSTZONE', 'EMULATED_TEE'],
    };
  }
}

export default OceanicosEnclaveEngine;
