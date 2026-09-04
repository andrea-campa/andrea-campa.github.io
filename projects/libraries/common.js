// Shared helpers for the p5.js sketches.

// Palette and type, from the portfolio.
const INK = '#f2f2f2';
const PAPER = '#1f1f1f';
const MUTED = '#8e8e8e';
const RULE = '#353535';
const MONO = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace';

// The page's title bar and caption bar sit above and below the canvas.
const CHROME_TOP = 36;
const CHROME_BOTTOM = 60;


/* Canvas ------------------------------------------------------------------ */

// Largest square that fits between the bars (edge to edge on phones),
// capped so big screens stay smooth.
function squareSize() {
  const phone = windowWidth < 600;
  const gap = phone ? 16 : 48;
  const fitW = phone ? windowWidth : windowWidth - gap * 2;
  const fitH = windowHeight - CHROME_TOP - CHROME_BOTTOM - gap * 2;
  return Math.max(200, Math.floor(Math.min(fitW, fitH, 820)));
}

// Creates the square canvas inside #canvas-container and returns its side.
function makeSquareCanvas() {
  const size = squareSize();
  createCanvas(size, size).parent('canvas-container');
  return size;
}

// Default resize behaviour. Sketches that cache things by size define
// their own windowResized (loaded after this file) to rebuild them.
function windowResized() {
  const size = squareSize();
  resizeCanvas(size, size);
}


/* Pointer ----------------------------------------------------------------- */

// p5 keeps mouseX/mouseY after a finger lifts or the mouse leaves, so
// remember what kind of pointer is in use to know if it's really there.
let pointerKind = null;
window.addEventListener('pointermove', (e) => { pointerKind = e.pointerType; }, { passive: true });
window.addEventListener('pointerdown', (e) => { pointerKind = e.pointerType; }, { passive: true });
document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) pointerKind = null; });

// True while a mouse hovers the canvas, or a finger or pen is down on it.
function pointerOnCanvas() {
  if (!pointerKind || (pointerKind !== 'mouse' && !mouseIsPressed)) return false;
  return mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height;
}


/* HUD --------------------------------------------------------------------- */

// Monospaced tag in a canvas corner, like the portfolio's status bar.
// corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
function hudTag(text, corner, color = INK, inset = 10) {
  const ctx = drawingContext;
  ctx.save();
  ctx.font = `11px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const w = Math.ceil(ctx.measureText(text).width) + 12;
  const h = 20;
  const x = corner.endsWith('right') ? width - inset - w : inset;
  const y = corner.startsWith('bottom') ? height - inset - h : inset;
  ctx.fillStyle = PAPER;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillText(text, x + 6, y + h / 2 + 1);
  ctx.restore();
}

// Inverted tag in the middle of the canvas, for moments (a corner hit,
// a style change). alpha fades it out.
function hudCenter(text, alpha = 1) {
  if (alpha <= 0) return;
  const ctx = drawingContext;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `12px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = Math.ceil(ctx.measureText(text).width) + 20;
  const h = 26;
  ctx.fillStyle = INK;
  ctx.fillRect(Math.round(width / 2 - w / 2), Math.round(height / 2 - h / 2), w, h);
  ctx.fillStyle = PAPER;
  ctx.fillText(text, width / 2, height / 2 + 1);
  ctx.restore();
}


/* Camera ------------------------------------------------------------------ */

// Front camera in a hidden <video>. #cam-hint says what's going on, and
// until frames arrive the sketches draw a generated test signal instead.
function startCamera() {
  const cam = {
    video: null,
    get live() {
      const v = this.video;
      return !!v && v.readyState >= 2 && v.videoWidth > 0;
    },
  };
  const hint = document.getElementById('cam-hint');
  const say = (text) => {
    if (!hint) return;
    hint.textContent = text;
    hint.hidden = !text;
  };

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    say('no camera here: showing a test signal');
    return cam;
  }

  say('allow camera access to see yourself');
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');

  navigator.mediaDevices
    .getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } })
    .then((stream) => {
      video.srcObject = stream;
      cam.video = video;
      return video.play();
    })
    .then(() => say(''))
    .catch((err) => {
      cam.video = null;
      const blocked = err && err.name === 'NotAllowedError';
      say(blocked ? 'camera blocked: showing a test signal' : 'no camera found: showing a test signal');
    });

  return cam;
}

// Centre-crops a video (or canvas) to a square and draws it into ctx at
// size x size, mirrored like a selfie.
function drawSquareCrop(ctx, source, sourceW, sourceH, size, mirror = true) {
  const side = Math.min(sourceW, sourceH);
  ctx.save();
  if (mirror) {
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, (sourceW - side) / 2, (sourceH - side) / 2, side, side, 0, 0, size, size);
  ctx.restore();
}

// Stand-in picture while there's no camera: soft coloured light drifting
// in the dark, so the effects still have something to chew on.
function drawTestSignal(ctx, size, t) {
  ctx.save();
  ctx.fillStyle = '#060606';
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const x = (noise(i * 7.1, t * 0.12) * 1.5 - 0.25) * size;
    const y = (noise(i * 7.1 + 3.3, t * 0.12) * 1.5 - 0.25) * size;
    const r = size * (0.2 + 0.3 * noise(i * 2.7, t * 0.2));
    const hue = Math.round(i * 72 + t * 12) % 360;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, `hsla(${hue}, 75%, 58%, 0.9)`);
    glow.addColorStop(1, `hsla(${hue}, 75%, 58%, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.restore();
}
