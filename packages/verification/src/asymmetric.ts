import crypto from 'crypto';

export interface AsymmetricKeyPair {
  publicKey: string;
  privateKey: string;
}

export class AsymmetricValidationGuard {
  /**
   * Generates a persistent or ephemeral ED25519 asymmetric cryptographic keypair.
   */
  public static generateKeyPair(): AsymmetricKeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    return {
      publicKey: publicKey.toString(),
      privateKey: privateKey.toString(),
    };
  }

  /**
   * Cryptographically signs a message/payload using an asymmetric private key.
   */
  public static sign(data: string | object, privateKeyPem: string): string {
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    const signature = crypto.sign(null, Buffer.from(serialized), privateKeyPem);
    return signature.toString('hex');
  }

  /**
   * Verifies an asymmetric signature against the payload using the public key.
   */
  public static verify(data: string | object, signatureHex: string, publicKeyPem: string): boolean {
    try {
      const serialized = typeof data === 'string' ? data : JSON.stringify(data);
      const signature = Buffer.from(signatureHex, 'hex');
      return crypto.verify(null, Buffer.from(serialized), publicKeyPem, signature);
    } catch {
      return false;
    }
  }
}
