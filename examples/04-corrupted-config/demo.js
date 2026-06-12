import { setTimeout } from 'node:timers/promises';

async function mockDatabaseConnection() {
  console.log('Connecting to database...');
  await setTimeout(50);
  return { status: 'connected' };
}

async function run() {
  const result = await mockDatabaseConnection();
  console.log('Database returned:', result);
}

run();
