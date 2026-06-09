/**
 * Security utilities for input sanitization and validation
 */

// XSS prevention: sanitize user input
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers (onclick=, etc)
    .trim();
}

// Sanitize UPI ID format
export function sanitizeUPI(upiId: string): string {
  // UPI format: alphanumeric@alphanumeric
  return upiId
    .toLowerCase()
    .replace(/[^a-z0-9@._-]/g, '') // Only allow valid UPI characters
    .trim();
}

// Validate UPI format
export function isValidUPI(upiId: string): boolean {
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/;
  return upiRegex.test(upiId) && upiId.length <= 50;
}

// Sanitize payment reference (alphanumeric only)
export function sanitizePaymentReference(ref: string): string {
  return ref.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
}

// Validate Ethereum address
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Sanitize Ethereum address
export function sanitizeEthereumAddress(address: string): string {
  const sanitized = address.toLowerCase().trim();
  return isValidEthereumAddress(sanitized) ? sanitized : '';
}

// Validate order amounts
export function isValidAmount(amount: number): boolean {
  return (
    typeof amount === 'number' &&
    !isNaN(amount) &&
    isFinite(amount) &&
    amount > 0 &&
    amount <= 100000 // Max 100k USDC/INR per order
  );
}

// Rate limiting key generators
export function generateRateLimitKey(prefix: string, identifier: string): string {
  // Remove special characters that could cause key injection
  const safeIdentifier = identifier.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
  return `${prefix}:${safeIdentifier}`;
}

// Prevent NoSQL injection in object keys
export function sanitizeObjectKeys(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Remove keys that contain $ or . (MongoDB operators)
    if (key.includes('$') || key.includes('.')) {
      continue;
    }
    
    sanitized[key] = typeof value === 'string' 
      ? sanitizeInput(value) 
      : value;
  }
  
  return sanitized;
}

// Security headers for API responses
export const apiSecurityHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store',
};
