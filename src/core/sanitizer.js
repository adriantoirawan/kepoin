import { getConfig } from '../utils/config.js';

/**
 * Safely sanitizes payloads for telemetry streaming.
 * Enforces dynamic key-based redaction, max depth limits, and circular reference checks.
 *
 * @param {any} payload The object to sanitize
 * @param {number} [overrideDepth] Optional depth override (e.g. for autopsy mode)
 * @returns {any} A sanitized deep clone suitable for JSON serialization
 */
export function sanitize(payload, overrideDepth = null) {
  const config = getConfig();
  const maxDepth = overrideDepth ?? config.maxDepth;
  const redactKeys = config.redactKeys;

  // Track visited objects to prevent circular reference cycles
  const visited = new WeakSet();

  function traverse(obj, currentDepth) {
    // Fast path: primitives
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    // Circular reference guard
    if (visited.has(obj)) {
      return '[Circular Reference]';
    }

    // Max depth guard
    if (currentDepth >= maxDepth) {
      return '[Max Depth Exceeded]';
    }

    visited.add(obj);

    if (Array.isArray(obj)) {
      return obj.map(item => traverse(item, currentDepth + 1));
    }

    // Handle plain objects and instances
    const sanitizedObj = {};
    for (const key in obj) {
      // Safety: Only iterate own properties or enumerable prototype properties safely
      try {
        if (redactKeys.has(key.toLowerCase())) {
          sanitizedObj[key] = '[REDACTED]';
        } else {
          sanitizedObj[key] = traverse(obj[key], currentDepth + 1);
        }
      } catch (e) {
        // Prevent getters that throw from crashing the sanitizer
        sanitizedObj[key] = '[Getter Error]';
      }
    }
    
    // Also include Map/Set contents if necessary, but typically object iteration is sufficient
    // for standard payloads in Node.js logs.
    if (obj instanceof Map) {
      sanitizedObj['[Map entries]'] = traverse(Array.from(obj.entries()), currentDepth + 1);
    } else if (obj instanceof Set) {
      sanitizedObj['[Set entries]'] = traverse(Array.from(obj.values()), currentDepth + 1);
    } else if (obj instanceof Error) {
      sanitizedObj.name = obj.name;
      sanitizedObj.message = obj.message;
      sanitizedObj.stack = obj.stack;
    }

    return sanitizedObj;
  }

  return traverse(payload, 0);
}
