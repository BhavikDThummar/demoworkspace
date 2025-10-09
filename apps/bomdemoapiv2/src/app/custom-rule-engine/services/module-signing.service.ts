/**
 * Module Signing Service
 * Provides cryptographic signing and verification for rule modules
 */

import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

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

@Injectable()
export class ModuleSigningService {
  private readonly logger = new Logger(ModuleSigningService.name);
  private readonly algorithm = 'RSA-SHA256';
  private readonly keySize = 2048;
  private readonly keysPath = path.join(process.cwd(), 'keys');
  private currentKeyId!: string;
  private privateKey!: string;
  private publicKey!: string;

  constructor() {
    this.initializeKeys();
  }

  /**
   * Initialize or load cryptographic keys
   */
  private initializeKeys(): void {
    try {
      // Ensure keys directory exists
      if (!fs.existsSync(this.keysPath)) {
        fs.mkdirSync(this.keysPath, { recursive: true });
      }

      // Try to load existing keys
      const keyFiles = fs
        .readdirSync(this.keysPath)
        .filter((file) => file.endsWith('.key'))
        .sort()
        .reverse(); // Get newest first

      if (keyFiles.length > 0) {
        this.loadExistingKeys(keyFiles[0]);
      } else {
        this.generateNewKeys();
      }

      this.logger.log(`Module signing initialized with key ID: ${this.currentKeyId}`);
    } catch (error) {
      this.logger.error('Failed to initialize keys', error);
      throw new Error('Module signing initialization failed');
    }
  }

  /**
   * Load existing key pair
   */
  private loadExistingKeys(keyFile: string): void {
    const keyPath = path.join(this.keysPath, keyFile);
    this.currentKeyId = keyFile.replace('.key', '');

    const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
    this.privateKey = keyData.privateKey;
    this.publicKey = keyData.publicKey;

    this.logger.debug(`Loaded existing keys: ${this.currentKeyId}`);
  }

  /**
   * Generate new RSA key pair
   */
  private generateNewKeys(): void {
    this.logger.log('Generating new RSA key pair...');

    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: this.keySize,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.currentKeyId = `key-${Date.now()}`;

    // Save keys to disk
    const keyData = {
      keyId: this.currentKeyId,
      algorithm: this.algorithm,
      created: new Date().toISOString(),
      publicKey: this.publicKey,
      privateKey: this.privateKey,
    };

    const keyPath = path.join(this.keysPath, `${this.currentKeyId}.key`);
    fs.writeFileSync(keyPath, JSON.stringify(keyData, null, 2));

    // Save public key separately for distribution
    const publicKeyPath = path.join(this.keysPath, `${this.currentKeyId}.pub`);
    fs.writeFileSync(publicKeyPath, this.publicKey);

    this.logger.log(`Generated new key pair: ${this.currentKeyId}`);
  }

  /**
   * Sign module content
   */
  signModule(content: string): SignedModule {
    try {
      // Calculate module hash
      const moduleHash = crypto.createHash('sha256').update(content).digest('hex');

      // Create signature payload
      const payload = {
        content: moduleHash,
        keyId: this.currentKeyId,
        timestamp: new Date().toISOString(),
        algorithm: this.algorithm,
      };

      // Sign the payload
      const sign = crypto.createSign(this.algorithm);
      sign.update(JSON.stringify(payload));
      const signature = sign.sign(this.privateKey, 'base64');

      const moduleSignature: ModuleSignature = {
        signature,
        algorithm: this.algorithm,
        keyId: this.currentKeyId,
        timestamp: payload.timestamp,
        moduleHash,
      };

      this.logger.debug(`Module signed with key ${this.currentKeyId}`);

      return {
        content,
        signature: moduleSignature,
      };
    } catch (error) {
      this.logger.error('Failed to sign module', error);
      throw new Error('Module signing failed');
    }
  }

  /**
   * Verify module signature
   */
  verifyModule(signedModule: SignedModule): boolean {
    try {
      const { content, signature } = signedModule;

      // Verify module hash
      const calculatedHash = crypto.createHash('sha256').update(content).digest('hex');
      if (calculatedHash !== signature.moduleHash) {
        this.logger.warn('Module hash mismatch');
        return false;
      }

      // Load public key for verification
      const publicKey = this.getPublicKey(signature.keyId);
      if (!publicKey) {
        this.logger.warn(`Public key not found for key ID: ${signature.keyId}`);
        return false;
      }

      // Recreate signature payload
      const payload = {
        content: signature.moduleHash,
        keyId: signature.keyId,
        timestamp: signature.timestamp,
        algorithm: signature.algorithm,
      };

      // Verify signature
      const verify = crypto.createVerify(signature.algorithm);
      verify.update(JSON.stringify(payload));
      const isValid = verify.verify(publicKey, signature.signature, 'base64');

      if (isValid) {
        this.logger.debug(`Module signature verified for key ${signature.keyId}`);
      } else {
        this.logger.warn(`Invalid module signature for key ${signature.keyId}`);
      }

      return isValid;
    } catch (error) {
      this.logger.error('Failed to verify module signature', error);
      return false;
    }
  }

  /**
   * Get public key by ID
   */
  private getPublicKey(keyId: string): string | null {
    try {
      // First try current key
      if (keyId === this.currentKeyId) {
        return this.publicKey;
      }

      // Try to load from disk
      const keyPath = path.join(this.keysPath, `${keyId}.key`);
      if (fs.existsSync(keyPath)) {
        const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
        return keyData.publicKey;
      }

      // Try public key file
      const pubKeyPath = path.join(this.keysPath, `${keyId}.pub`);
      if (fs.existsSync(pubKeyPath)) {
        return fs.readFileSync(pubKeyPath, 'utf-8');
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to load public key ${keyId}`, error);
      return null;
    }
  }

  /**
   * Rotate keys (generate new key pair)
   */
  rotateKeys(): string {
    this.logger.log('Rotating cryptographic keys...');

    const oldKeyId = this.currentKeyId;
    this.generateNewKeys();

    this.logger.log(`Keys rotated from ${oldKeyId} to ${this.currentKeyId}`);
    return this.currentKeyId;
  }

  /**
   * Get current key information
   */
  getKeyInfo() {
    return {
      keyId: this.currentKeyId,
      algorithm: this.algorithm,
      keySize: this.keySize,
      publicKey: this.publicKey,
    };
  }

  /**
   * List available keys
   */
  listKeys() {
    try {
      const keyFiles = fs
        .readdirSync(this.keysPath)
        .filter((file) => file.endsWith('.key'))
        .map((file) => {
          const keyPath = path.join(this.keysPath, file);
          const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
          return {
            keyId: keyData.keyId,
            created: keyData.created,
            algorithm: keyData.algorithm,
            current: keyData.keyId === this.currentKeyId,
          };
        })
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

      return keyFiles;
    } catch (error) {
      this.logger.error('Failed to list keys', error);
      return [];
    }
  }

  /**
   * Clean up old keys (keep last N keys)
   */
  cleanupOldKeys(keepCount = 3): void {
    try {
      const keys = this.listKeys();
      const keysToDelete = keys.slice(keepCount);

      keysToDelete.forEach((key) => {
        if (!key.current) {
          const keyPath = path.join(this.keysPath, `${key.keyId}.key`);
          const pubKeyPath = path.join(this.keysPath, `${key.keyId}.pub`);

          if (fs.existsSync(keyPath)) {
            fs.unlinkSync(keyPath);
          }
          if (fs.existsSync(pubKeyPath)) {
            fs.unlinkSync(pubKeyPath);
          }

          this.logger.debug(`Deleted old key: ${key.keyId}`);
        }
      });

      this.logger.log(`Key cleanup completed, kept ${keepCount} keys`);
    } catch (error) {
      this.logger.error('Failed to cleanup old keys', error);
    }
  }
}
