import { kepoin } from 'kepoin';

class PaymentProcessor {
  async chargeCreditCard(amount, ccData) {
    return new Promise(resolve => setTimeout(() => resolve({ status: 'success', amount }), 100));
  }
}

// 1. Manually wrap ONLY the PaymentProcessor instance
const payments = kepoin(new PaymentProcessor(), 'PaymentProcessor');

async function run() {
  console.log("--- Starting Surgical Tracing Demo ---");
  
  // 2. We pass a highly sensitive payload
  const sensitivePayload = {
    user: 'alice@example.com',
    stripe_key: 'sk_live_123456789',
    cardNumber: '4111-1111-1111-1111' // To redact this, use --redact="cardNumber"
  };

  // 3. The proxy will track this specific call and automatically redact `stripe_key`
  await payments.chargeCreditCard(50.00, sensitivePayload);
  
  console.log("--- Demo Complete ---");
}

run();
