// DotCam: the webcam as a live halftone of squares, dots or ascii.
// Move across the canvas to change the grid, click to switch style.

const STYLES = ['squares', 'dots', 'ascii'];
const RAMP = ' .:-=+*#%@';     // ascii, empty to dense
const MIN_CELL = 6;            // px, finest grid
const MAX_CELL = 32;           // px, coarsest grid
const MIN_ASCII_CELL = 9;      // characters need a bit more room

let cam;
let sample;                    // one pixel per cell: the browser does the averaging
let sampleCtx;
let levels = null;             // smoothed brightness per cell
let lo = 0.1;                  // running auto-levels
let hi = 0.9;
let cell = 13;
let cellTarget = 13;
let style = 0;
let switchedAt = -10;

function setup() {
  makeSquareCanvas();
  describe('Your webcam, redrawn live as a halftone: squares, dots or text characters whose size follows the brightness of the picture.');
  cam = startCamera();
  sample = document.createElement('canvas');
  sampleCtx = sample.getContext('2d', { willReadFrequently: true });
}

function draw() {
  const mode = STYLES[style];
  if (pointerKind === 'mouse' && pointerOnCanvas()) cellTarget = gridFromPointer();
  cell += (cellTarget - cell) * 0.15;
  const n = Math.max(8, Math.round(width / Math.max(cell, mode === 'ascii' ? MIN_ASCII_CELL : 0)));
  const step = width / n;

  // 1. Shrink the source to n x n.
  const fresh = sample.width !== n;
  if (fresh) {
    sample.width = n;
    sample.height = n;
    levels = new Float32Array(n * n);
  }
  if (cam.live) drawSquareCrop(sampleCtx, cam.video, cam.video.videoWidth, cam.video.videoHeight, n);
  else drawTestSignal(sampleCtx, n, millis() / 1000);
  const px = sampleCtx.getImageData(0, 0, n, n).data;

  // 2. Luminance, smoothed over time to calm sensor noise, with running
  //    auto-levels so a dim room still uses the full range.
  let darkest = 1;
  let brightest = 0;
  for (let i = 0, o = 0; i < n * n; i++, o += 4) {
    const l = (0.2126 * px[o] + 0.7152 * px[o + 1] + 0.0722 * px[o + 2]) / 255;
    const v = fresh ? l : levels[i] + (l - levels[i]) * 0.55;
    levels[i] = v;
    if (v < darkest) darkest = v;
    if (v > brightest) brightest = v;
  }
  lo += (darkest - lo) * 0.06;
  hi += (Math.max(brightest, lo + 0.15) - hi) * 0.06;
  const range = hi - lo;

  // 3. Draw. Shape area tracks brightness (hence the square roots), so
  //    tones read true instead of going muddy in the mid-greys.
  background(PAPER);
  const ctx = drawingContext;
  ctx.fillStyle = INK;
  if (mode === 'ascii') {
    ctx.font = `${Math.round(step * 1.1)}px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  } else {
    ctx.beginPath();
  }

  for (let y = 0, i = 0; y < n; y++) {
    const cy = (y + 0.5) * step;
    for (let x = 0; x < n; x++, i++) {
      const v = Math.min(1, Math.max(0, (levels[i] - lo) / range));
      if (v < 0.02) continue;
      const cx = (x + 0.5) * step;
      if (mode === 'squares') {
        const side = Math.sqrt(v) * step * 0.94;
        ctx.rect(cx - side / 2, cy - side / 2, side, side);
      } else if (mode === 'dots') {
        const r = Math.sqrt(v) * step * 0.56;
        ctx.moveTo(cx + r, cy);
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
      } else {
        const ch = RAMP[Math.round(v * (RAMP.length - 1))];
        if (ch !== ' ') ctx.fillText(ch, cx, cy);
      }
    }
  }
  if (mode !== 'ascii') ctx.fill();

  hudTag(cam.live ? '● live' : '○ test signal', 'top-left', cam.live ? INK : MUTED);
  hudTag(`${mode} · ${n}×${n}`, 'bottom-left');
  const since = (millis() - switchedAt) / 1000;
  hudCenter(mode, Math.min(1, (1.1 - since) / 0.3));
}

function gridFromPointer() {
  return map(mouseX, 0, width, MIN_CELL, MAX_CELL, true);
}

function nextStyle() {
  style = (style + 1) % STYLES.length;
  switchedAt = millis();
}

function mousePressed() {
  if (pointerKind !== 'mouse' || !pointerOnCanvas()) return;
  nextStyle();
  return false;
}

// Touch: a tap switches style, a drag sets the grid.
let touchStart = null;

function touchStarted() {
  if (!pointerOnCanvas()) return;
  touchStart = { x: mouseX, y: mouseY, moved: false };
  return false;
}

function touchMoved() {
  if (!touchStart) return;
  if (dist(mouseX, mouseY, touchStart.x, touchStart.y) > 8) touchStart.moved = true;
  if (touchStart.moved) cellTarget = gridFromPointer();
  return false;
}

function touchEnded() {
  if (touchStart && !touchStart.moved) nextStyle();
  touchStart = null;
}

function keyPressed() {
  if (key === ' ') {
    nextStyle();
    return false;
  }
}
