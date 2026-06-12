/**
 * This script intentionally crashes.
 * Notice that it doesn't import `kepoin` anywhere!
 * The Orchestrator will inject kepoin via `--require kepoin/register`.
 */

function authenticateUser(userId) {
  // A highly sensitive local variable mapped into V8 memory
  const localSecretToken = "super_secret_jwt_token_12345";
  const permissions = ["read", "write"];

  setTimeout(() => {
    function validate() {
      const localSecretToken = "super_secret_jwt_token_12345";
      const permissions = ["read", "write"];
      console.log("Validating user with token:", localSecretToken);
      
      // Intentional Crash
      throw new Error("Database connection lost during query execution.");
    }
    validate();
  }, 100);
}

authenticateUser(42);
