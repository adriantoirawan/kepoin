// A simple function to capitalize strings
function capitalize(str) {
  if (typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Export the function so others can import it
module.exports = { capitalize };