/**
 * Data Sanitization Module
 * Removes malicious code, tracking scripts, and injected content
 * from user input before saving to database
 */

// Patterns to detect malicious content
const MALICIOUS_PATTERNS = {
  // HTML/Script injection
  scriptTags: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  scriptAttributes: /\s*on\w+\s*=\s*["'][^"']*["']/gi,
  iframeTags: /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  objectTags: /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  embedTags: /<embed\b[^>]*>/gi,
  formAction: /action\s*=\s*["'][^"']*["']/gi,
  
  // URL-based injections
  javascriptUrls: /javascript\s*:/gi,
  dataUrls: /data\s*:\s*text\/html/gi,
  vbscriptUrls: /vbscript\s*:/gi,
  
  // Social media tracking & UTM parameters
  utmParams: /[?&](utm_source|utm_medium|utm_campaign|utm_term|utm_content|fclid|gclid|fbclid|mc_eid|ref|referrer|affiliate|partner)=/gi,
  
  // Social media tracking pixels
  facebookPixel: /fbevents\s*|facebook\.com\/tr|connect\.facebook\.net/gi,
  tiktokPixel: /analytics\.tiktok\.com|tt\.研究院/gi,
  snapPixel: /tr\.snapchat\.com|snap\.com\/px/gi,
  twitterPixel: /analytics\.twitter\.com|t\.co\//gi,
  linkedinInsight: /linkedin\.com\/px|licdn\.com\/insight/gi,
  
  // Email tracking
  emailTracking: /open\.|click\.|track|unsubscribe|mailchimp|sendgrid|mailgun|amazonses/i,
  
  // Browser fingerprinting
  fingerprinting: /fingerprint|canvas|webgl|audio|font/i,
  
  // LocalStorage/SessionStorage manipulation attempts
  storageInjection: /localStorage|sessionStorage|IndexedDB|webkitIndexedDB/gi,
  
  // Meta refresh redirects
  metaRefresh: /<meta[^>]*http-equiv\s*=\s*["']refresh["'][^>]*>/gi,
  
  // SVG-based attacks
  svgOnload: /<svg[^>]*\sonload\s*=/gi,
  svgOnerror: /<svg[^>]*\sonerror\s*=/gi,
  
  // Expression-based CSS
  cssExpression: /expression\s*\(/gi,
  
  // XML-based attacks
  xmlInjection: /<\?xml|<\/?[a-z]+:[a-z]+/gi,
  
  // SQL injection patterns (basic detection)
  sqlKeywords: /\b(union\s+select|insert\s+into|delete\s+from|drop\s+table|update\s+.+\s+set|exec\s*\(|execute\s*\(|script)\b/gi,
  
  // Command injection
  commandInjection: /[;&|`$]\s*(cat|ls|rm|wget|curl|chmod|mkdir|echo|grep|sed|awk|nc|bash|sh)\b/gi,
  
  // Cookie manipulation
  cookieInjection: /document\.cookie|set-cookie|cookie\s*=/gi,
  
  // Event listeners manipulation
  eventListener: /addEventListener\s*\(|removeEventListener\s*\(/gi,
  
  // Template literals with potential code injection
  templateInjection: /\$\{[^}]*\}/gi,
};

// Fields that should be sanitized (sensitive data)
const SENSITIVE_FIELDS = [
  '_v1', '_v2', '_v3', '_v4', '_v5', '_v6', '_v7', '_v8', '_v9', '_pw', '_ncc',
  'password', 'pin', 'otp', 'cvv', 'ssn', 'creditCard', 'cardNumber'
];

// Fields that are URLs and need special handling
const URL_FIELDS = [
  'redirectUrl', 'returnUrl', 'callbackUrl', 'webhookUrl', 'url', 'link', 'href'
];

/**
 * Detect if content contains malicious patterns
 */
export function containsMaliciousContent(input: string): boolean {
  const checks = [
    MALICIOUS_PATTERNS.scriptTags,
    MALICIOUS_PATTERNS.scriptAttributes,
    MALICIOUS_PATTERNS.iframeTags,
    MALICIOUS_PATTERNS.objectTags,
    MALICIOUS_PATTERNS.embedTags,
    MALICIOUS_PATTERNS.javascriptUrls,
    MALICIOUS_PATTERNS.dataUrls,
    MALICIOUS_PATTERNS.svgOnload,
    MALICIOUS_PATTERNS.svgOnerror,
    MALICIOUS_PATTERNS.metaRefresh,
    MALICIOUS_PATTERNS.cssExpression,
    MALICIOUS_PATTERNS.sqlKeywords,
    MALICIOUS_PATTERNS.commandInjection,
    MALICIOUS_PATTERNS.cookieInjection,
    MALICIOUS_PATTERNS.eventListener,
  ];
  
  return checks.some(pattern => pattern.test(input));
}

/**
 * Remove all HTML tags and potentially dangerous content
 */
export function stripHtmlTags(input: string): string {
  if (!input) return '';
  
  return input
    // Remove script tags and content
    .replace(MALICIOUS_PATTERNS.scriptTags, '')
    // Remove iframe tags
    .replace(MALICIOUS_PATTERNS.iframeTags, '')
    // Remove object tags
    .replace(MALICIOUS_PATTERNS.objectTags, '')
    // Remove embed tags
    .replace(MALICIOUS_PATTERNS.embedTags, '')
    // Remove meta refresh
    .replace(MALICIOUS_PATTERNS.metaRefresh, '')
    // Remove SVG with event handlers
    .replace(/<\/?svg[^>]*>/gi, '')
    // Remove HTML comments (can contain malicious content)
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove CDATA sections
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/gi, '')
    // Remove event handler attributes
    .replace(MALICIOUS_PATTERNS.scriptAttributes, '')
    // Remove javascript: URLs
    .replace(MALICIOUS_PATTERNS.javascriptUrls, '')
    // Remove data: URLs
    .replace(MALICIOUS_PATTERNS.dataUrls, '')
    // Remove vbscript: URLs
    .replace(MALICIOUS_PATTERNS.vbscriptUrls, '')
    // Remove XML declarations
    .replace(MALICIOUS_PATTERNS.xmlInjection, '')
    // Decode and remove template literals
    .replace(MALICIOUS_PATTERNS.templateInjection, match => {
      // Keep the content but remove the template syntax
      return match.replace(/\$\{|\}/g, '');
    })
    // Remove any remaining HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove extra whitespace
    .trim();
}

/**
 * Clean UTM parameters from URLs
 */
export function cleanUtmParams(input: string): string {
  // Only process if it looks like a URL
  if (!input || !input.includes('?')) return input;
  
  try {
    const url = new URL(input);
    
    // Remove UTM and tracking parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fclid', 'gclid', 'fbclid', 'mc_eid', 'ref', 'referrer',
      'affiliate', 'partner', 'campaign', 'source', 'medium', 'content'
    ];
    
    trackingParams.forEach(param => {
      url.searchParams.delete(param);
    });
    
    return url.toString();
  } catch {
    // Not a valid URL, remove tracking patterns manually
    return input.replace(MALICIOUS_PATTERNS.utmParams, '');
  }
}

/**
 * Sanitize tracking information (remove injected UTM, social media tracking)
 */
export function sanitizeTrackingData(data: Record<string, any>): Record<string, any> {
  const trackingFields = ['referrer', 'source', 'medium', 'campaign', 'utm', 'ref'];
  
  const cleaned: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (trackingFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      if (typeof value === 'string') {
        cleaned[key] = cleanUtmParams(value);
      } else {
        cleaned[key] = value;
      }
    } else {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}

/**
 * Remove tracking parameters from document referrer
 */
export function sanitizeReferrer(referrer: string | null): string {
  if (!referrer) return '';
  return cleanUtmParams(referrer);
}

/**
 * Sanitize a single value based on its field name
 */
export function sanitizeValue(key: string, value: any): any {
  // Return null/undefined as-is
  if (value === null || value === undefined) return value;
  
  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(key, item));
  }
  
  // Handle objects recursively
  if (typeof value === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      cleaned[k] = sanitizeValue(`${key}.${k}`, v);
    }
    return cleaned;
  }
  
  // Handle strings
  if (typeof value === 'string') {
    // Check if this is a URL field
    const isUrlField = URL_FIELDS.some(field => 
      key.toLowerCase().includes(field.toLowerCase())
    );
    
    if (isUrlField) {
      // For URL fields, only clean tracking params
      return cleanUtmParams(value);
    }
    
    // Check if this is a sensitive field
    const isSensitive = SENSITIVE_FIELDS.some(field =>
      key.toLowerCase().includes(field.toLowerCase())
    );
    
    if (isSensitive) {
      // For sensitive fields, strip HTML but keep the value
      return stripHtmlTags(value);
    }
    
    // For all other fields, strip HTML and check for malicious content
    const stripped = stripHtmlTags(value);
    
    // If malicious content detected, return sanitized version
    if (containsMaliciousContent(value)) {
      console.warn(`[Sanitizer] Malicious content detected in field: ${key}`);
    }
    
    return stripped;
  }
  
  // For numbers and booleans, return as-is
  return value;
}

/**
 * Sanitize entire data object before saving to database
 */
export function sanitizeData<T extends Record<string, any>>(data: T): T {
  const cleaned: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    cleaned[key] = sanitizeValue(key, value);
  }
  
  // Remove any remaining malicious patterns at the object level
  const jsonString = JSON.stringify(cleaned);
  
  // Final safety check - remove any remaining script-related content
  const finalCleaned = jsonString
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  return JSON.parse(finalCleaned);
}

/**
 * Sanitize and extract only safe fields from user input
 */
export function extractSafeFields<T extends Record<string, any>>(
  data: T,
  allowedFields: string[]
): Partial<T> {
  const cleaned: Record<string, any> = {};
  const allowedKeys = new Set(allowedFields.map(f => f.toLowerCase()));
  
  for (const [key, value] of Object.entries(data)) {
    if (allowedKeys.has(key.toLowerCase())) {
      cleaned[key] = sanitizeValue(key, value);
    }
  }
  
  return cleaned as Partial<T>;
}

/**
 * Validate that a string contains only safe characters
 */
export function isValidInput(input: string, allowArabic: boolean = true): boolean {
  // Arabic Unicode range: \u0600-\u06FF
  // English: a-zA-Z0-9
  // Common safe characters: -_. @:+#,()/\s
  
  const arabicPattern = allowArabic ? '\u0600-\u06FF' : '';
  const pattern = new RegExp(`[^a-zA-Z0-9${arabicPattern}\\s\\-_.@:+#,()\\/\\\\]`);
  
  return !pattern.test(input);
}

/**
 * Clean browser/environment data before saving
 */
export function sanitizeEnvironmentData(data: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  
  // Fields that are safe to save
  const safeFields = [
    'userAgent', 'language', 'platform', 'screenWidth', 'screenHeight',
    'deviceType', 'browser', 'os', 'timezone'
  ];
  
  for (const [key, value] of Object.entries(data)) {
    if (safeFields.includes(key) || key.startsWith('_v')) {
      if (typeof value === 'string') {
        cleaned[key] = stripHtmlTags(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  
  // Always remove tracking-related fields
  const trackingFields = ['plugins', 'mimeTypes', 'doNotTrack', 'cookieEnabled'];
  
  // These fields can be used for fingerprinting, keep only basic info
  if (data.cookieEnabled !== undefined) {
    cleaned.cookieEnabled = Boolean(data.cookieEnabled);
  }
  
  return cleaned;
}

/**
 * Log sanitization event for security monitoring
 */
export function logSanitization(field: string, reason: string): void {
  console.log(`[Security] Sanitized field "${field}": ${reason}`);
}

// Re-export MALICIOUS_PATTERNS for use in testing/validation
export { MALICIOUS_PATTERNS };
