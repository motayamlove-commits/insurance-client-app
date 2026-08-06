/**
 * Data Sanitization Utility
 * Removes HTML, JavaScript, and other potentially harmful content
 * from user input data
 */

/**
 * Removes HTML and JavaScript tags from a string
 * @param str - The string to sanitize
 * @returns Sanitized string with HTML/JS removed
 */
export function sanitizeString(str: string): string {
  if (!str || typeof str !== 'string') {
    return '';
  }

  // Remove HTML tags and scripts
  let sanitized = str
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove style tags and their content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove all HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    // Remove multiple spaces
    .replace(/\s+/g, ' ')
    // Trim whitespace
    .trim();

  return sanitized;
}

/**
 * Sanitizes an entire data object
 * @param data - The data object to sanitize
 * @returns Sanitized data object
 */
export function sanitizeData(data: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      sanitized[key] = value;
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeData(value);
    } else if (Array.isArray(value)) {
      // Sanitize array items
      sanitized[key] = value.map((item) => {
        if (typeof item === 'string') {
          return sanitizeString(item);
        } else if (typeof item === 'object' && item !== null) {
          return sanitizeData(item);
        }
        return item;
      });
    } else {
      // Keep other types as-is (numbers, booleans, etc.)
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Checks if a string contains HTML or script tags
 * @param str - The string to check
 * @returns True if HTML/script content is detected
 */
export function containsHtmlOrScript(str: string): boolean {
  if (!str || typeof str !== 'string') {
    return false;
  }

  const htmlScriptRegex = /<[^>]*>/g;
  const scriptContent = /<script|<iframe|<object|<embed|javascript:/gi;

  return htmlScriptRegex.test(str) || scriptContent.test(str);
}

/**
 * Sanitizes specific sensitive fields that should never contain HTML
 * @param data - The data object
 * @returns Data with sensitive fields sanitized
 */
export function sanitizeSensitiveFields(data: Record<string, any>): Record<string, any> {
  const sensitiveFields = [
    'ownerName',
    'buyerName',
    'phoneNumber',
    'vehicleModel',
    'identityNumber',
    'buyerIdNumber',
    'serialNumber',
    'cardHolderName',
    'notes',
  ];

  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (field in sanitized && typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeString(sanitized[field]);
    }
  }

  return sanitized;
}

/**
 * Log sanitization activity (development only)
 * @param fieldName - Name of the field that was sanitized
 * @param originalLength - Original data length
 * @param sanitizedLength - Sanitized data length
 */
export function logSanitization(
  fieldName: string,
  originalLength: number,
  sanitizedLength: number
): void {
  if (process.env.NODE_ENV === 'development') {
    if (originalLength !== sanitizedLength) {
      console.log(
        `[SANITIZATION] Field "${fieldName}" cleaned: ${originalLength} → ${sanitizedLength} chars`
      );
    }
  }
}
