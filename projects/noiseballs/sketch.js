// NoiseBalls: a grid of dots riding a slow Perlin-noise current, drawn
// like a wind map (each dot trails a line back to its resting point).
// The pointer parts the field; click to drop a ripple, drag to leave a wake.

const COLS = 32;
const NOISE_SCALE = 0.08;      // noise units per grid cell
const REACH = 0.2;             // pointer lens radius, fraction of the canvas
const RIPPLE_SPEED = 0.42;     // canvas widths per second
const RIPPLE_LIFE = 3.2;       // seconds
const WAKE_EVERY = 0.12;       // seconds between ripples while dragging

let flow = 0;                  // position along the noise field's time axis
let ripples = [];
let lastDrop = -1;
const lens = { x: 0, y: 0, k: 0 };

function setup() {
  makeSquareCanvas();
  describe('A grid of white dots on a dark field, each carried by a slowly shifting Perlin-noise current, with a faint line back to its resting point. The pointer pushes the dots aside and clicks send ripples through the grid.');
  noiseDetail(3, 0.45);
}

function draw() {
  const dt = Math.min(deltaTime / 1000, 0.05);
  const now = millis() / 1000;
  flow += dt * 0.09;

  const s = width;
  const gap = s / COLS;
  const reach = s * REACH;
  const on = pointerOnCanvas();

  // The lens eases in and follows the pointer with a little lag.
  if (on && lens.k < 0.01) {
    lens.x = mouseX;
    lens.y = mouseY;
  }
  lens.k += ((on ? 1 : 0) - lens.k) * 0.08;
  if (on) {
    lens.x += (mouseX - lens.x) * 0.3;
    lens.y += (mouseY - lens.y) * 0.3;
  }

  // Dragging leaves a wake of small ripples.
  if (on && mouseIsPressed && now - lastDrop > WAKE_EVERY) drop(mouseX, mouseY, now);
  ripples = ripples.filter((r) => now - r.t < RIPPLE_LIFE);

  const tails = new Path2D();
  const dots = new Path2D();
  for (let j = 0; j < COLS; j++) {
    for (let i = 0; i < COLS; i++) {
      const hx = (i + 0.5) * gap;
      const hy = (j + 0.5) * gap;

      // The current: noise picks a direction and a strength per point.
      const nx = i * NOISE_SCALE;
      const ny = j * NOISE_SCALE;
      const angle = noise(nx, ny, flow) * Math.PI * 4;
      const force = noise(nx + 40, ny + 40, flow * 1.4);
      let x = hx + Math.cos(angle) * force * gap * 1.3;
      let y = hy + Math.sin(angle) * force * gap * 1.3;
      let r = gap * (0.05 + 0.2 * force * force);

      // The pointer pushes dots outward, strongest at its centre.
      if (lens.k > 0.01) {
        const dx = x - lens.x;
        const dy = y - lens.y;
        const d = Math.hypot(dx, dy);
        if (d < reach && d > 0.0001) {
          const f = (1 - d / reach) ** 2 * lens.k;
          x += (dx / d) * f * reach * 0.5;
          y += (dy / d) * f * reach * 0.5;
          r *= 1 + f;
        }
      }

      // Ripples: a short wave packet travelling outward, fading with age.
      for (const ripple of ripples) {
        const age = now - ripple.t;
        const dx = hx - ripple.x;
        const dy = hy - ripple.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        const behind = d - age * s * RIPPLE_SPEED;
        const band = gap * 3.5;
        if (behind > -band && behind < band) {
          const env = Math.cos((behind / band) * (Math.PI / 2)) * Math.exp(-age * 1.1) * ripple.amp;
          const push = Math.sin((behind / gap) * 1.7) * gap * 1.1 * env;
          x += (dx / d) * push;
          y += (dy / d) * push;
          r *= 1 + 0.8 * env;
        }
      }

      tails.moveTo(hx, hy);
      tails.lineTo(x, y);
      dots.moveTo(x + r, y);
      dots.arc(x, y, r, 0, Math.PI * 2);
    }
  }

  background(PAPER);
  const ctx = drawingContext;
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(242, 242, 242, 0.16)';
  ctx.stroke(tails);
  ctx.fillStyle = INK;
  ctx.fill(dots);
}

function drop(x, y, now, amp = 0.55) {
  ripples.push({ x, y, t: now, amp });
  lastDrop = now;
  if (ripples.length > 10) ripples.shift();
}

function mousePressed() {
  if (!pointerOnCanvas()) return;
  drop(mouseX, mouseY, millis() / 1000, 1);
  return false;
}

function keyPressed() {
  if (key === ' ') {
    drop(width / 2, height / 2, millis() / 1000, 1);
    return false;
  }
}
