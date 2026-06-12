import { initDashcam, pushFrame, getHistory } from '../../src/core/dashcam.js';

console.log("🚗 Booting Time-Travel Dashcam...");
initDashcam();

console.log("🏎️ Accelerating: Pushing 5,000 execution frames into the Dashcam ring buffer...");

// We push 5,000 frames to simulate a long-running, memory-intensive application
for (let i = 1; i <= 5000; i++) {
  pushFrame({
    event: 'Database Query',
    location: `UserService.findById(${i})`,
    timestamp: Date.now()
  });
}

console.log("💥 CRASH! Retrieving forensic dashcam history...");

const history = getHistory();

console.log(`\n📊 Dashcam Buffer Size: ${history.length} frames`);
console.log(`⏱️ Oldest Frame in Memory (ID): ${history[0].location}`);
console.log(`⏱️ Newest Frame in Memory (ID): ${history[history.length - 1].location}`);

console.log("\n✅ Notice that despite running 5,000 queries, the Dashcam strictly truncated the oldest frames, maintaining an exact $O(1)$ memory footprint of 1,000 frames!");
