const DB = require('./db.cjs');

async function main() {
  console.log("--- Starting kepoin Demo ---");
  
  // 1. Asynchronous tracking
  const users = await DB.getUsers();
  
  // 2. Circular reference and redaction testing
  const payload = { token: "super-secret-token", data: users };
  payload.self = payload; // circular reference
  
  DB.processPayload(payload);
  
  // 3. Crash interception
  DB.causeCrash();
}

main();
