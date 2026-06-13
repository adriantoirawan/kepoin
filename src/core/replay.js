import fs from 'node:fs';
import readline from 'node:readline';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function printPausedPrompt() {
  console.log(`\n\x1b[36m[kepoin:ui] ⏸ Paused. Controls: [Space] Next 50 lines | [A] Auto-Play | [S] Skip to Anomaly | [Q] Quit\x1b[0m\n`);
}

/**
 * Boots the Interactive Cinematic Replay Engine for .spil files.
 */
export async function startReplay(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`\x1b[31m[kepoin:error]\x1b[0m Cannot find trace file: ${filePath}`);
    process.exit(1);
  }

  const stream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let state = 'PAUSED'; // PAUSED, PAGINATE, AUTOPLAY, SKIP
  let speedDelay = 100; // ms per line during Auto-Play
  let bulletTimeLines = 0; // Countdown for Matrix slow-mo
  let linesPrintedSincePause = 0;
  const slidingBuffer = []; // Circular buffer for Time-Skip feature

  console.clear();
  console.log(`\x1b[46m\x1b[37m 🎬 KEPOIN CINEMATIC REPLAY ENGINE \x1b[0m`);
  console.log(`\x1b[36mFile:\x1b[0m ${filePath}\n`);
  printPausedPrompt();

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', (buffer) => {
      const key = buffer.toString().toLowerCase();
      
      // Ctrl+C (0x03) or Q to Quit
      if (key === '\u0003' || key === 'q') {
        console.log('\n\x1b[36m[kepoin:ui]\x1b[0m Replay terminated.');
        process.exit(0);
      }

      if (key === ' ') {
        if (state === 'PAUSED') {
          linesPrintedSincePause = 0;
          state = 'PAGINATE';
        } else {
          state = 'PAUSED';
          printPausedPrompt();
        }
      } else if (key === 'a') {
        state = 'AUTOPLAY';
        console.log(`\n\x1b[35m[kepoin:ui] ▶ Auto-Play started. Controls: [+] Speed Up | [-] Slow Down | [Space] Pause | [S] Skip to Anomaly\x1b[0m\n`);
      } else if (key === 's') {
        state = 'SKIP';
        console.log(`\n\x1b[33m[kepoin:ui] ⏩ Fast-forwarding to next anomaly...\x1b[0m`);
      } else if (key === '+' || key === '=') {
        speedDelay = Math.max(10, speedDelay - 30);
        console.log(`\x1b[90mSpeed: ${speedDelay}ms/line\x1b[0m`);
      } else if (key === '-' || key === '_') {
        speedDelay = Math.min(1000, speedDelay + 30);
        console.log(`\x1b[90mSpeed: ${speedDelay}ms/line\x1b[0m`);
      }
    });
  }

  // Iterate over the stream with O(1) memory footprint
  for await (const rawLine of rl) {
    let line = rawLine;
    let isAnomaly = false;

    // 1. Regex Recolorizer (Restore ANSI)
    if (line.includes('▶ Executing:')) {
      line = line.replace('▶ Executing:', '\x1b[36m▶ Executing:\x1b[0m');
    } else if (line.includes('✔ Resolved:')) {
      line = line.replace('✔ Resolved:', '\x1b[32m✔ Resolved:\x1b[0m');
    } else if (line.includes('✖ Failed:')) {
      line = line.replace('✖ Failed:', '\x1b[31m✖ Failed:\x1b[0m');
      isAnomaly = true;
    }
    
    // Restore Gutter styling (Dim up to the │ symbol)
    line = line.replace(/^(.+? │)/, '\x1b[90m$1\x1b[0m');

    // Maintain the Sliding Context Buffer
    slidingBuffer.push(line);
    if (slidingBuffer.length > 10) {
      slidingBuffer.shift();
    }

    // 2. State Machine Routing
    if (state === 'SKIP') {
      if (isAnomaly) {
        state = 'AUTOPLAY';
        bulletTimeLines = 10;
        
        // Dump the historical context buffer to the screen
        for (const bufferedLine of slidingBuffer) {
          console.log(bufferedLine);
        }
        console.log(`\n\x1b[5m\x1b[41m\x1b[37m 💥 ANOMALY DETECTED - ENTERING BULLET TIME 💥 \x1b[0m\n`);
        await sleep(500); // Cinematic Halt
      }
      continue; // Silently fast-forward if no anomaly
    }

    console.log(line);

    // 3. Bullet Time Engager
    if (isAnomaly && state !== 'SKIP') {
      console.log(`\n\x1b[5m\x1b[41m\x1b[37m 💥 ANOMALY DETECTED - ENTERING BULLET TIME 💥 \x1b[0m\n`);
      bulletTimeLines = 10;
      await sleep(500);
    }

    // 4. Pacing Engine
    if (state === 'PAGINATE') {
      linesPrintedSincePause++;
      if (linesPrintedSincePause >= 50) {
        state = 'PAUSED';
        printPausedPrompt();
      }
    } else if (state === 'AUTOPLAY') {
      if (bulletTimeLines > 0) {
        bulletTimeLines--;
        await sleep(1000); // 1 line per sec during Bullet Time
      } else {
        await sleep(speedDelay); // Normal speed
      }
    }

    // Yield control loop if Paused
    while (state === 'PAUSED') {
      await sleep(50);
    }
  }

  console.log('\n\x1b[32m[kepoin:ui]\x1b[0m 🏁 Replay finished. Reached EOF.');
  process.exit(0);
}
