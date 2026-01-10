import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

export class EncryptionService {
  private encryptionKey: Buffer;

  constructor(secretKey?: string) {
    const key = secretKey || process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
    this.encryptionKey = crypto.scryptSync(key, 'salt', KEY_LENGTH);
  }

  /**
   * Encrypt sensitive data (PII)
   */
  encrypt(plaintext: string): string {
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Format: iv:authTag:encrypted
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error: any) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive data (PII)
   */
  decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivHex, authTagHex, encrypted] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error: any) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Hash sensitive data for comparison (e.g., passwords, tokens)
   */
  hash(data: string): string {
    const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
    const hash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Verify hashed data
   */
  verifyHash(data: string, hashedData: string): boolean {
    try {
      const parts = hashedData.split(':');
      if (parts.length !== 2) {
        return false;
      }

      const [salt, originalHash] = parts;
      const hash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex');
      return hash === originalHash;
    } catch {
      return false;
    }
  }

  /**
   * Generate secure random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Encrypt customer PII fields
   */
  encryptCustomerPII(data: {
    email?: string;
    phone?: string;
    name?: string;
    address?: string;
  }): {
    email?: string;
    phone?: string;
    name?: string;
    address?: string;
  } {
    const encrypted: any = {};
    
    if (data.email) encrypted.email = this.encrypt(data.email);
    if (data.phone) encrypted.phone = this.encrypt(data.phone);
    if (data.name) encrypted.name = this.encrypt(data.name);
    if (data.address) encrypted.address = this.encrypt(data.address);

    return encrypted;
  }

  /**
   * Decrypt customer PII fields
   */
  decryptCustomerPII(data: {
    email?: string;
    phone?: string;
    name?: string;
    address?: string;
  }): {
    email?: string;
    phone?: string;
    name?: string;
    address?: string;
  } {
    const decrypted: any = {};
    
    if (data.email) {
      try {
        decrypted.email = this.decrypt(data.email);
      } catch {
        decrypted.email = data.email; // Return as-is if decryption fails (might not be encrypted)
      }
    }
    
    if (data.phone) {
      try {
        decrypted.phone = this.decrypt(data.phone);
      } catch {
        decrypted.phone = data.phone;
      }
    }
    
    if (data.name) {
      try {
        decrypted.name = this.decrypt(data.name);
      } catch {
        decrypted.name = data.name;
      }
    }
    
    if (data.address) {
      try {
        decrypted.address = this.decrypt(data.address);
      } catch {
        decrypted.address = data.address;
      }
    }

    return decrypted;
  }
}

// Singleton instance
export const encryptionService = new EncryptionService();
