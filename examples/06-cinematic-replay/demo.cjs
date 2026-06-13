const { Server } = require('./modules.cjs');

async function startSimulation() {
  console.log("🚀 Starting Server Simulation...");
  
  // Generate 500 successful logs
  for (let i = 1; i <= 500; i++) {
    await Server.handleRequest(i);
  }

  // Generate the Anomaly
  try {
    await Server.triggerMaintenance();
  } catch (e) {
    // Caught internally so the simulation continues
  }

  // Generate 500 more successful logs
  for (let i = 501; i <= 1000; i++) {
    await Server.handleRequest(i);
  }

  console.log("🏁 Simulation Complete.");
}

startSimulation();
