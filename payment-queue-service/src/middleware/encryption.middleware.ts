import { Request, Response, NextFunction } from 'express';
import { encryptionService } from '../utils/encryption';
import logger from '../utils/logger';

/**
 * Encrypt sensitive fields in request body before processing
 */
export const encryptSensitiveFields = (fields: string[] = ['email', 'phone', 'address', 'name']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.body) {
        return next();
      }

      // Encrypt direct fields
      fields.forEach((field) => {
        if (req.body[field] && typeof req.body[field] === 'string') {
          req.body[field] = encryptionService.encrypt(req.body[field]);
        }
      });

      // Encrypt metadata fields if present
      if (req.body.metadata && typeof req.body.metadata === 'object') {
        if (req.body.metadata.customerEmail) {
          req.body.metadata.customerEmail = encryptionService.encrypt(req.body.metadata.customerEmail);
        }
        if (req.body.metadata.customerPhone) {
          req.body.metadata.customerPhone = encryptionService.encrypt(req.body.metadata.customerPhone);
        }
        if (req.body.metadata.customerName) {
          req.body.metadata.customerName = encryptionService.encrypt(req.body.metadata.customerName);
        }
        if (req.body.metadata.customerAddress) {
          req.body.metadata.customerAddress = encryptionService.encrypt(req.body.metadata.customerAddress);
        }
      }

      next();
    } catch (error: any) {
      logger.error('Encryption middleware error', {
        error: error.message,
        path: req.path,
      });
      next(error);
    }
  };
};

/**
 * Decrypt sensitive fields in response before sending
 * This should be used carefully and only for authorized requests
 */
export const decryptSensitiveFields = (fields: string[] = ['email', 'phone', 'address', 'name']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const originalJson = res.json.bind(res);

      res.json = function (data: any) {
        if (data && typeof data === 'object') {
          // Decrypt direct fields
          fields.forEach((field) => {
            if (data[field] && typeof data[field] === 'string') {
              try {
                data[field] = encryptionService.decrypt(data[field]);
              } catch {
                // Field might not be encrypted, leave as is
              }
            }
          });

          // Decrypt nested metadata fields
          if (data.metadata && typeof data.metadata === 'object') {
            if (data.metadata.customerEmail) {
              try {
                data.metadata.customerEmail = encryptionService.decrypt(data.metadata.customerEmail);
              } catch {
                // Ignore decryption errors
              }
            }
            if (data.metadata.customerPhone) {
              try {
                data.metadata.customerPhone = encryptionService.decrypt(data.metadata.customerPhone);
              } catch {
                // Ignore decryption errors
              }
            }
            if (data.metadata.customerName) {
              try {
                data.metadata.customerName = encryptionService.decrypt(data.metadata.customerName);
              } catch {
                // Ignore decryption errors
              }
            }
            if (data.metadata.customerAddress) {
              try {
                data.metadata.customerAddress = encryptionService.decrypt(data.metadata.customerAddress);
              } catch {
                // Ignore decryption errors
              }
            }
          }

          // Handle arrays of data
          if (Array.isArray(data)) {
            data = data.map((item) => {
              if (item && typeof item === 'object') {
                fields.forEach((field) => {
                  if (item[field] && typeof item[field] === 'string') {
                    try {
                      item[field] = encryptionService.decrypt(item[field]);
                    } catch {
                      // Ignore decryption errors
                    }
                  }
                });
              }
              return item;
            });
          }

          // Handle nested data object
          if (data.data && typeof data.data === 'object') {
            if (Array.isArray(data.data)) {
              data.data = data.data.map((item: any) => {
                if (item && typeof item === 'object') {
                  fields.forEach((field) => {
                    if (item[field] && typeof item[field] === 'string') {
                      try {
                        item[field] = encryptionService.decrypt(item[field]);
                      } catch {
                        // Ignore decryption errors
                      }
                    }
                  });
                }
                return item;
              });
            } else {
              fields.forEach((field) => {
                if (data.data[field] && typeof data.data[field] === 'string') {
                  try {
                    data.data[field] = encryptionService.decrypt(data.data[field]);
                  } catch {
                    // Ignore decryption errors
                  }
                }
              });
            }
          }
        }

        return originalJson(data);
      };

      next();
    } catch (error: any) {
      logger.error('Decryption middleware error', {
        error: error.message,
        path: req.path,
      });
      next(error);
    }
  };
};

/**
 * Mask sensitive data in response (partial visibility)
 */
export const maskSensitiveFields = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const originalJson = res.json.bind(res);

      res.json = function (data: any) {
        if (data && typeof data === 'object') {
          // Mask email
          if (data.email && typeof data.email === 'string') {
            data.email = maskEmail(data.email);
          }

          // Mask phone
          if (data.phone && typeof data.phone === 'string') {
            data.phone = maskPhone(data.phone);
          }

          // Mask in metadata
          if (data.metadata && typeof data.metadata === 'object') {
            if (data.metadata.customerEmail) {
              data.metadata.customerEmail = maskEmail(data.metadata.customerEmail);
            }
            if (data.metadata.customerPhone) {
              data.metadata.customerPhone = maskPhone(data.metadata.customerPhone);
            }
          }

          // Handle arrays
          if (Array.isArray(data)) {
            data = data.map((item) => {
              if (item && typeof item === 'object') {
                if (item.email) item.email = maskEmail(item.email);
                if (item.phone) item.phone = maskPhone(item.phone);
              }
              return item;
            });
          }

          // Handle nested data
          if (data.data && Array.isArray(data.data)) {
            data.data = data.data.map((item: any) => {
              if (item && typeof item === 'object') {
                if (item.email) item.email = maskEmail(item.email);
                if (item.phone) item.phone = maskPhone(item.phone);
              }
              return item;
            });
          }
        }

        return originalJson(data);
      };

      next();
    } catch (error: any) {
      logger.error('Masking middleware error', {
        error: error.message,
        path: req.path,
      });
      next(error);
    }
  };
};

/**
 * Helper function to mask email
 */
function maskEmail(email: string): string {
  try {
    const [username, domain] = email.split('@');
    if (!username || !domain) return email;
    
    const visibleChars = Math.min(3, Math.floor(username.length / 2));
    const masked = username.substring(0, visibleChars) + '***';
    
    return `${masked}@${domain}`;
  } catch {
    return email;
  }
}

/**
 * Helper function to mask phone
 */
function maskPhone(phone: string): string {
  try {
    if (phone.length < 4) return phone;
    
    const lastFour = phone.slice(-4);
    const masked = '*'.repeat(phone.length - 4) + lastFour;
    
    return masked;
  } catch {
    return phone;
  }
}
