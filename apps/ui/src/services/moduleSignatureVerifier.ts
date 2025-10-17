/**
 * Module Signature Verifier
 * Verifies cryptographic signatures of rule modules in the browser
 */

export interface ModuleSignature {
  signature: string;
  algorithm: string;
  keyId: string;
  timestamp: string;
  moduleHash: string;
}

export interface SignedModule {
  content: string;
  signature: ModuleSignature;
}

export interface PublicKeyInfo {
  keyId: string;
  publicKey: string;
  algorithm: string;
}

/**
 * Browser-compatible signature verification using Web Crypto API
 */
export class ModuleSignatureVerifier {
  private publicKeys: Map<string, CryptoKey> = new Map();
  private readonly algorithm = 'RSASSA-PKCS1-v1_5';
  private readonly hashAlgorithm = 'SHA-256';

  /**
   * Import public key for verification
   */
  async importPublicKey(keyInfo: PublicKeyInfo): Promise<void> {
    try {
      // Convert PEM to ArrayBuffer
      const pemKey = keyInfo.publicKey
        .replace(/-----BEGIN PUBLIC KEY-----/, '')
        .replace(/-----END PUBLIC KEY-----/, '')
        .replace(/\s/g, '');
      
      const keyData = this.base64ToArrayBuffer(pemKey);

      // Import the key using Web Crypto API
      const cryptoKey = await window.crypto.subtle.importKey(
        'spki',
        keyData,
        {
          name: this.algorithm,
          hash: this.hashAlgorithm,
        },
        false,
        ['verify']
      );

      this.publicKeys.set(keyInfo.keyId, cryptoKey);
      console.log(`Imported public key: ${keyInfo.keyId}`);
    } catch (error) {
      console.error(`Failed to import public key ${keyInfo.keyId}:`, error);
      throw new Error(`Public key import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify module signature
   */
  async verifyModule(signedModule: SignedModule): Promise<boolean> {
    try {
      const { content, signature } = signedModule;

      // Check if we have the public key
      const publicKey = this.publicKeys.get(signature.keyId);
      if (!publicKey) {
        console.warn(`Public key not available for key ID: ${signature.keyId}`);
        return false;
      }

      // Verify module hash
      const calculatedHash = await this.calculateHash(content);
      if (calculatedHash !== signature.moduleHash) {
        console.warn('Module hash mismatch');
        return false;
      }

      // Recreate signature payload
      const payload = {
        content: signature.moduleHash,
        keyId: signature.keyId,
        timestamp: signature.timestamp,
        algorithm: signature.algorithm
      };

      const payloadString = JSON.stringify(payload);
      const payloadBuffer = new TextEncoder().encode(payloadString);

      // Decode signature from base64
      const signatureBuffer = this.base64ToArrayBuffer(signature.signature);

      // Verify signature using Web Crypto API
      const isValid = await window.crypto.subtle.verify(
        this.algorithm,
        publicKey,
        signatureBuffer,
        payloadBuffer
      );

      if (isValid) {
        console.log(`Module signature verified for key ${signature.keyId}`);
      } else {
        console.warn(`Invalid module signature for key ${signature.keyId}`);
      }

      return isValid;
    } catch (error) {
      console.error('Failed to verify module signature:', error);
      return false;
    }
  }

  /**
   * Calculate SHA-256 hash of content
   */
  private async calculateHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return this.arrayBufferToHex(hashBuffer);
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Convert ArrayBuffer to hex string
   */
  private arrayBufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Check if signature is recent (within time window)
   */
  isSignatureRecent(signature: ModuleSignature, maxAgeMinutes = 60): boolean {
    const signatureTime = new Date(signature.timestamp);
    const now = new Date();
    const ageMinutes = (now.getTime() - signatureTime.getTime()) / (1000 * 60);
    
    return ageMinutes <= maxAgeMinutes;
  }

  /**
   * Get loaded public key IDs
   */
  getLoadedKeyIds(): string[] {
    return Array.from(this.publicKeys.keys());
  }

  /**
   * Clear all loaded keys
   */
  clearKeys(): void {
    this.publicKeys.clear();
  }
}

/**
 * Singleton instance for global use
 */
export const moduleSignatureVerifier = new ModuleSignatureVerifier();