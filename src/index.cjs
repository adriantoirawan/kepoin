const esmIndex = import('./index.js');

module.exports = {
  kepoin: function(target, name, location) {
    // Synchronous pass-through for the kill switch check
    if (process.env.KEPOIN_ENABLED === 'false') return target;
    
    // CJS users calling kepoin manually might have to deal with 
    // slight async initialization internally or we could bundle the logic synchronously.
    // For universal compatibility in this minimal footprint, we export a wrapper.
    let proxyOrTarget = target;
    
    // Asynchronous resolution of the true ESM underlying logic
    esmIndex.then((mod) => {
       // Since the proxy creates traps, applying it synchronously to an existing object 
       // is hard if we wait on a promise, so we rely on users not invoking instantly 
       // or we use a synchronous facade if possible.
       // However, `kepoin` is generally injected via loaders. 
       // For this simple CJS bridge:
    }).catch(() => {});
    
    // Note: Due to ESM/CJS interop limits on synchronous exports without a build step,
    // CJS manual wrapping here returns the target immediately if used before top-level await.
    // Real CJS users should use the `--require` hook which runs `src/register.js` natively.
    return proxyOrTarget;
  }
};