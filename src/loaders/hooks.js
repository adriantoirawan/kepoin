import { fileURLToPath } from 'node:url';
import { initForensics } from '../core/forensics.js';

// Initialize the crash handlers on loader startup
initForensics();

function shouldProxyUrl(url) {
  if (url.startsWith('node:')) return false;
  if (url.includes('node_modules')) return false;
  return url.startsWith('file://');
}

export async function resolve(specifier, context, nextResolve) {
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);

  // In a full implementation without external transpilers, 
  // one would inject an export wrapper here by modifying result.source.
  // For this v1, we focus on CJS interception and Forensics initialization.
  // Full ESM AST parsing for export mutation would exceed zero-dependency constraints
  // in a reliable way, so we rely on manual `kepoin` wrapping for ESM for now,
  // while CJS gets automatic wrapping.
  
  return result;
}
