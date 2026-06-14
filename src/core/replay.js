import fs from 'node:fs';
import readline from 'node:readline';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let state = 'PLAYING'; // PAUSED, PLAYING, PAGINATE, SKIP, SCROLLING
let previousState = 'PLAYING';
let speedDelay = 100; // ms per line during Auto-Play
let bulletTimeLines = 0; // Countdown for Matrix slow-mo
let linesPrintedSincePause = 0;
const slidingBuffer = []; // Circular buffer for Time-Skip feature
const historyBuffer = [];
const MAX_HISTORY = 50000;
let scrollOffset = 0;
let isBooting = true;
let skipBoot = false;
let footerMsg = null;
let footerMsgTimeout = null;

function initAlternateScreen() {
  process.stdout.write('\x1b[?1049h'); // Enter alternate screen
  process.stdout.write('\x1b[?25l');   // Hide cursor
  process.stdout.write('\x1b[2J\x1b[H'); // Clear screen, go home
  
  const rows = process.stdout.rows || 24;
  process.stdout.write(`\x1b[1;${Math.max(1, rows - 2)}r`); // Set scrolling region
  
  const cleanup = () => {
    process.stdout.write('\x1b[r'); // Reset scrolling region
    process.stdout.write('\x1b[?25h'); // Show cursor
    process.stdout.write('\x1b[?1049l'); // Exit alternate screen
    process.exit(0);
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  
  process.on('SIGWINCH', () => {
    const newRows = process.stdout.rows || 24;
    process.stdout.write(`\x1b[1;${Math.max(1, newRows - 2)}r`);
    drawFooter();
  });
  
  return cleanup;
}

function drawFooter() {
  if (isBooting) return;
  const rows = process.stdout.rows || 24;
  const cols = process.stdout.columns || 80;
  
  process.stdout.write('\x1b7'); // Save cursor
  
  // Footer Line 1 (Status)
  process.stdout.write(`\x1b[${rows - 1};1H`);
  if (footerMsg) {
    const bg = footerMsg.includes('UNRECOGNIZED') ? '\x1b[41m' : '\x1b[46m';
    const text = ` ${footerMsg} `.padEnd(cols, ' ');
    process.stdout.write(`${bg}\x1b[37m\x1b[1m${text}\x1b[0m\r`);
  } else {
    const statusText = ` 🎬 KEPOIN REPLAY | State: ${state.padEnd(8)} | Speed: ${speedDelay.toString().padStart(4)}ms `.padEnd(cols, ' ');
    process.stdout.write(`\x1b[46m\x1b[30m${statusText}\x1b[0m\r`);
  }
  
  // Footer Line 2 (Controls)
  process.stdout.write(`\x1b[${rows};1H`);
  const controlsText = ` [Space] Play/Pause | [N] Next 50 Lines | [S] Skip to Anomaly | [+] Faster | [-] Slower | [Q] Quit `.padEnd(cols, ' ');
  process.stdout.write(`\x1b[0m\x1b[37m${controlsText}\x1b[0m\r`);
  
  process.stdout.write('\x1b8'); // Restore cursor
}

function showFooterAlert(msg, ms = 3000) {
  footerMsg = msg;
  drawFooter();
  if (footerMsgTimeout) clearTimeout(footerMsgTimeout);
  footerMsgTimeout = setTimeout(() => {
    footerMsg = null;
    drawFooter();
  }, ms);
}

function renderScrollback() {
  const rows = process.stdout.rows || 24;
  const canvasHeight = Math.max(1, rows - 2);
  const startIndex = Math.max(0, historyBuffer.length - canvasHeight - scrollOffset);
  const slice = historyBuffer.slice(startIndex, startIndex + canvasHeight);
  
  process.stdout.write('\x1b7'); // Save cursor
  process.stdout.write('\x1b[1;1H'); // Move to top-left
  
  for (let i = 0; i < canvasHeight; i++) {
    const line = slice[i] || '';
    process.stdout.write(line + '\x1b[K' + (i < canvasHeight - 1 ? '\n' : ''));
  }
  
  process.stdout.write('\x1b8'); // Restore cursor
}

async function playBootAnimation(filePath) {
  process.stdout.write('\x1b[0m\x1b[2J\x1b[H'); // Clear entirely
  isBooting = false;
  drawFooter();
  console.log(`\x1b[46m\x1b[37m 🎬 KEPOIN CINEMATIC REPLAY ENGINE \x1b[0m`);
  console.log(`\x1b[36mFile:\x1b[0m ${filePath}\n`);
}

async function playAnomalyAnimation() {
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;
  
  process.stdout.write('\x1b[41m\x1b[2J'); // Red background flash
  const msg = " 💥 ANOMALY DETECTED 💥 ";
  process.stdout.write(`\x1b[${Math.floor(rows/2)};${Math.floor((cols-msg.length)/2)}H\x1b[41m\x1b[37m\x1b[1m${msg}\x1b[0m`);
  
  // Play the Terminal Bell 3 times
  for (let i = 0; i < 3; i++) {
    process.stdout.write('\x07');
    await sleep(200);
  }
  
  process.stdout.write('\x1b[0m\x1b[2J\x1b[H'); // Reset background clear
  for (const bufferedLine of slidingBuffer) {
    console.log(bufferedLine);
  }
  drawFooter();
}

/**
 * Boots the Interactive Cinematic Replay Engine for .spil files.
 */
export async function startReplay(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`\x1b[31m[kepoin:error]\x1b[0m Cannot find trace file: ${filePath}`);
    process.exit(1);
  }

  const cleanup = initAlternateScreen();

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', (buffer) => {
      const key = buffer.toString().toLowerCase();
      
      if (isBooting) {
        if (key === '\r' || key === '\n') {
          skipBoot = true;
        }
        return;
      }
      
      // Ctrl+C (0x03) or Q to Quit
      if (key === '\u0003' || key === 'q') {
        cleanup();
      }

      if (key === ' ') {
        if (state === 'PAUSED' || state === 'SCROLLING') {
          scrollOffset = 0;
          state = state === 'SCROLLING' ? previousState : 'PLAYING';
          if (state === 'PLAYING') renderScrollback();
        } else {
          state = 'PAUSED';
        }
        drawFooter();
      } else if (key === 'n') {
        if (state !== 'PAGINATE') {
          if (state !== 'SCROLLING') previousState = state;
          scrollOffset = 0;
          state = 'PAGINATE';
          linesPrintedSincePause = 0;
          renderScrollback();
        }
        drawFooter();
      } else if (key === 's') {
        scrollOffset = 0;
        state = 'SKIP';
        drawFooter();
      } else if (key === '\u001b[a') { // Up Arrow
        if (state !== 'SCROLLING') {
          previousState = state;
          state = 'SCROLLING';
        }
        const rows = process.stdout.rows || 24;
        scrollOffset = Math.min(historyBuffer.length - Math.max(1, rows - 2), scrollOffset + 1);
        renderScrollback();
        drawFooter();
      } else if (key === '\u001b[b') { // Down Arrow
        if (state === 'SCROLLING') {
          if (scrollOffset === 0) {
            process.stdout.write('\x07');
            showFooterAlert('ALREADY AT THE LATEST LOG LINE');
          } else {
            scrollOffset = Math.max(0, scrollOffset - 1);
            renderScrollback();
          }
        }
      } else if (key === '\u001b[5~') { // Page Up
        if (state !== 'SCROLLING') {
          previousState = state;
          state = 'SCROLLING';
        }
        const rows = process.stdout.rows || 24;
        scrollOffset = Math.min(historyBuffer.length - Math.max(1, rows - 2), scrollOffset + Math.max(1, rows - 2));
        renderScrollback();
        drawFooter();
      } else if (key === '\u001b[6~') { // Page Down
        if (state === 'SCROLLING') {
          const rows = process.stdout.rows || 24;
          scrollOffset = Math.max(0, scrollOffset - Math.max(1, rows - 2));
          renderScrollback();
          if (scrollOffset === 0) {
            process.stdout.write('\x07');
            showFooterAlert('ALREADY AT THE LATEST LOG LINE');
          }
        }
      } else if (key === '+' || key === '=') {
        speedDelay = Math.max(10, speedDelay - 30);
        drawFooter();
      } else if (key === '-' || key === '_') {
        speedDelay = Math.min(1000, speedDelay + 30);
        drawFooter();
      } else {
        // Unrecognized key triggers Red Alert and Bullet Time
        bulletTimeLines = 3;
        showFooterAlert('UNRECOGNIZED KEY! PLEASE USE THE CONTROLS BELOW');
      }
    });
  }

  await playBootAnimation(filePath);

  const stream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  // Iterate over the stream with O(1) memory footprint
  for await (const rawLine of rl) {
    let line = rawLine;
    let isAnomaly = false;

    // Regex Recolorizer (Restore ANSI)
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
    
    // Restore ID Cyan styling
    line = line.replace(/(\[#\d+\])/, '\x1b[36m$1\x1b[0m');

    // Maintain the Sliding Context Buffer
    slidingBuffer.push(line);
    if (slidingBuffer.length > 10) {
      slidingBuffer.shift();
    }
    
    historyBuffer.push(line);
    if (historyBuffer.length > MAX_HISTORY) {
      historyBuffer.shift();
    }

    if (state === 'SKIP') {
      if (isAnomaly) {
        state = 'PLAYING';
        bulletTimeLines = 10;
        await playAnomalyAnimation();
        drawFooter();
      }
      continue; // Silently fast-forward if no anomaly
    }

    if (state !== 'SCROLLING') {
      console.log(line);
    }

    if (isAnomaly && state !== 'SKIP') {
      bulletTimeLines = 10;
      await playAnomalyAnimation();
    }

    // Pacing Engine
    if (state === 'PAGINATE') {
      linesPrintedSincePause++;
      if (linesPrintedSincePause >= 50) {
        state = previousState;
        drawFooter();
      }
    } else if (state === 'PLAYING') {
      if (bulletTimeLines > 0) {
        bulletTimeLines--;
        await sleep(1000); // 1 line per sec during Bullet Time
      } else {
        await sleep(speedDelay); // Normal speed
      }
    }

    // Yield control loop if Paused or Scrolling
    while (state === 'PAUSED' || state === 'SCROLLING') {
      await sleep(50);
    }
  }

  showFooterAlert('🏁 REPLAY FINISHED. REACHED EOF. PRESS Q TO QUIT', 9999999);
  state = 'PAUSED';
  drawFooter();
  
  // Keep alive until user quits
  while (true) {
    await sleep(1000);
  }
}
