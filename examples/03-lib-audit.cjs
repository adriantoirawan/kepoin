exports.veryFastFunction = function() { return 'Fast result'; }; exports.verySlowFunction = async function() { return new Promise(resolve => setTimeout(() => resolve('Slow result'), 250)); };
