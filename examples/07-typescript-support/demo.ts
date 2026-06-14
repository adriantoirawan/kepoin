import { kepoin } from 'kepoin'; // In production, you would import from 'kepoin'

// Define some static types to prove compatibility
interface UserProfile {
  id: number;
  name: string;
}

class AuthService {
  /**
   * Intentionally causes a type-related crash to demonstrate the Diagnostics Engine
   * highlighting the crash natively inside TypeScript.
   */
  async login(user: UserProfile) {
    console.log(`[App] Logging in user: ${user.name}`);
    
    // Simulate a complex query returning an unexpected payload (e.g. an array instead of object)
    const databaseResult = [1, 2, 3];
    
    // TypeScript might warn you, but what if this is cast as 'any' at runtime?
    const rawData: any = databaseResult;
    
    // Crash 1: Calling an object method on an array
    if (rawData.hasOwnProperty('error')) {
      throw new Error("Login Failed!");
    }
    
    // Crash 2: Trying to call .map() on an Object (simulated via cast)
    const responseData: any = { id: user.id };
    
    // This will trigger the Diagnostics Engine!
    return responseData.map((el: any) => el.id);
  }
}

// ------------------------------------------------------------
// 1. SURGICAL TRACING IN TYPESCRIPT
// ------------------------------------------------------------
// The TypeScript compiler perfectly understands 'kepoin' now thanks to src/index.d.ts
// Notice how it preserves the type of AuthService!
const TracedAuthService = kepoin(new AuthService(), 'AuthService', import.meta.url);

async function runDemo() {
  const profile: UserProfile = { id: 1, name: "Katar" };
  
  try {
    await TracedAuthService.login(profile);
  } catch (err) {
    // Expected to crash. The Telemetry Engine handles the formatting.
  }
}

runDemo();
