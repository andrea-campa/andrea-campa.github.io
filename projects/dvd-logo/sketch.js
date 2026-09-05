// DVD logo synth: the old screensaver, played as an instrument.
// Each wall is a keyboard: where the logo lands picks the note, where it
// sits on screen pans it, and a corner hit plays a chord.
// Click for sound, hold to fast-forward.

const SPEED = 0.2;             // canvas widths per second, on each axis
const FAST = 5;                // fast-forward multiplier while held
const HOLD_MS = 260;           // a press longer than this is a hold
const KEYS = 10;               // keys along each wall
const KEY_FADE = 0.9;          // seconds a key stays lit
const CORNER_WINDOW = 0.05;    // seconds between an x and a y hit that still make a corner
const ECHO_TIME = 0.3;         // delay time, shared by the sound and the afterimages
const WALLS = ['top', 'right', 'bottom', 'left'];
const WALL_ROOT = { bottom: 48, left: 60, right: 60, top: 67 }; // MIDI notes
const PENTATONIC = [0, 2, 4, 7, 9];
const NOTE_NAMES = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];

let source;                    // the DVD logo, black on transparent
let logo;                      // tinted copy at display size
let ghost;                     // pale copy for afterimages
let lw;                        // logo size, as a fraction of the canvas
let lh;
let px;                        // position (top-left) and velocity, same units
let py;
let vx;
let vy;
let logoHue;
let simTime = 0;
let lastHitX = -1;
let lastHitY = -1;
let bounces = 0;
let corners = 0;
let cornerAt = -10;
let cornerLabel = '';
let lastNote = '';
let ghosts = [];               // afterimages at impact points
const lit = new Map();         // 'wall:key' -> { t, hue }
let pressedAt = 0;
let audio = null;              // built on the first click
let soundOn = false;

function preload() {
  source = loadImage('dvd_logo.png');
}

function setup() {
  makeSquareCanvas();
  colorMode(HSB, 360, 100, 100, 1);
  describe('The DVD logo bounces around a dark screen and changes colour at every wall. The walls are keyboards: with sound on, each hit plays a note and a corner hit plays a chord.');

  lw = 0.24;
  lh = (lw * source.height) / source.width;
  px = random(0, 1 - lw);
  py = random(0, 1 - lh);
  vx = random([-1, 1]) * SPEED;
  vy = random([-1, 1]) * SPEED;
  logoHue = random(360);
  buildLogos();

  // A hold that ends outside the window shouldn't fast-forward forever.
  window.addEventListener('blur', () => { pressedAt = 0; });
}

function windowResized() {
  const size = squareSize();
  resizeCanvas(size, size);
  buildLogos();
}

function draw() {
  const t = millis() / 1000;
  const holding = pressedAt > 0 && millis() - pressedAt > HOLD_MS;
  const dt = Math.min(deltaTime / 1000, 0.05) * (holding ? FAST : 1);
  simTime += dt;
  move(dt, t);

  background(0, 0, 5);
  drawKeys(t);
  drawCorners(t);
  drawGhosts(t);
  image(logo, px * width, py * width, lw * width, lh * width);
  drawCornerFlash(t);
  drawHud(holding);
}


/* Motion ------------------------------------------------------------------ */

function move(dt, t) {
  px += vx * dt;
  py += vy * dt;

  const maxX = 1 - lw;
  const maxY = 1 - lh;
  let wallX = null;
  let wallY = null;
  if (px < 0) { px = -px; vx = Math.abs(vx); wallX = 'left'; }
  else if (px > maxX) { px = 2 * maxX - px; vx = -Math.abs(vx); wallX = 'right'; }
  if (py < 0) { py = -py; vy = Math.abs(vy); wallY = 'top'; }
  else if (py > maxY) { py = 2 * maxY - py; vy = -Math.abs(vy); wallY = 'bottom'; }
  if (!wallX && !wallY) return;

  // A corner: both walls in one frame, or the second one a moment later.
  const corner = (wallX && wallY)
    || (wallX && simTime - lastHitY < CORNER_WINDOW)
    || (wallY && simTime - lastHitX < CORNER_WINDOW);
  if (wallX) lastHitX = simTime;
  if (wallY) lastHitY = simTime;

  bounces++;
  logoHue = (logoHue + 137.5) % 360; // golden angle: never two similar colours in a row
  paint(logo, color(logoHue, 80, 100));
  ghosts.push({ x: px, y: py, t });

  if (corner) cornerHit(t);
  else strike(wallX || wallY, t);
}

// The key under the logo's centre, along a wall's playable span.
function strike(wall, t) {
  const along = wall === 'top' || wall === 'bottom' ? px / (1 - lw) : 1 - py / (1 - lh);
  const key = constrain(Math.floor(along * KEYS), 0, KEYS - 1);
  lit.set(`${wall}:${key}`, { t, hue: logoHue });

  const midi = WALL_ROOT[wall] + 12 * Math.floor(key / PENTATONIC.length) + PENTATONIC[key % PENTATONIC.length];
  lastNote = `${wall} · ${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
  play(midi, map(px + lw / 2, 0, 1, -0.85, 0.85));
}

function cornerHit(t) {
  corners++;
  cornerAt = t;
  const vertical = py < (1 - lh) / 2 ? 'top' : 'bottom';
  const horizontal = px < (1 - lw) / 2 ? 'left' : 'right';
  cornerLabel = `corner! ${vertical} ${horizontal}`;

  // Every key lights up, sweeping clockwise round the frame.
  const order = {
    top: (k) => k,
    right: (k) => KEYS + (KEYS - 1 - k),
    bottom: (k) => 2 * KEYS + (KEYS - 1 - k),
    left: (k) => 3 * KEYS + k,
  };
  for (const wall of WALLS) {
    for (let k = 0; k < KEYS; k++) {
      const i = order[wall](k);
      lit.set(`${wall}:${k}`, { t: t + i * 0.012, hue: (logoHue + i * 9) % 360 });
    }
  }
  chord();
}


/* Drawing ----------------------------------------------------------------- */

// Tinted copies of the logo at display size; recolouring one on a bounce
// is far cheaper than tint() on every frame.
function buildLogos() {
  if (logo) {
    logo.remove();
    ghost.remove();
  }
  const w = Math.ceil(lw * width);
  const h = Math.ceil(lh * width);
  logo = createGraphics(w, h);
  ghost = createGraphics(w, h);
  paint(logo, color(logoHue, 80, 100));
  paint(ghost, color(0, 0, 95));
}

function paint(g, c) {
  g.clear();
  g.image(source, 0, 0, g.width, g.height);
  g.drawingContext.globalCompositeOperation = 'source-in';
  g.noStroke();
  g.fill(c);
  g.rect(0, 0, g.width, g.height);
  g.drawingContext.globalCompositeOperation = 'source-over';
}

// Keys run along each wall between the corners, which stay free for the
// corner hit. A struck key lights in the logo's colour and sinks in.
function keyRect(wall, k, depth) {
  const s = width;
  const gap = 2;
  if (wall === 'top' || wall === 'bottom') {
    const span = (1 - lw) * s;
    const size = span / KEYS;
    const x = (lw / 2) * s + k * size;
    return [x + gap / 2, wall === 'top' ? 0 : s - depth, size - gap, depth];
  }
  const span = (1 - lh) * s;
  const size = span / KEYS;
  const y = (1 - lh / 2) * s - (k + 1) * size;
  return [wall === 'left' ? 0 : s - depth, y + gap / 2, depth, size - gap];
}

function drawKeys(t) {
  noStroke();
  for (const wall of WALLS) {
    for (let k = 0; k < KEYS; k++) {
      const id = `${wall}:${k}`;
      const hit = lit.get(id);
      let level = 0;
      if (hit && t >= hit.t) {
        level = 1 - (t - hit.t) / KEY_FADE;
        if (level <= 0) {
          lit.delete(id);
          level = 0;
        }
      }
      if (level > 0) fill(hit.hue, 80, 100, 0.3 + 0.7 * level);
      else fill(0, 0, 21);
      rect(...keyRect(wall, k, 3 + 8 * level));
    }
  }
}

// Registration marks in the corners; they flash on a corner hit.
function drawCorners(t) {
  const flash = constrain(1 - (t - cornerAt) / 1.2, 0, 1);
  const s = width;
  const m = 6;
  const len = 14;
  noFill();
  strokeWeight(1.5);
  stroke(0, 0, 55 + 45 * flash);
  for (const [x, y, dx, dy] of [[m, m, 1, 1], [s - m, m, -1, 1], [m, s - m, 1, -1], [s - m, s - m, -1, -1]]) {
    line(x, y, x + dx * len, y);
    line(x, y, x, y + dy * len);
  }
  noStroke();
}

// Afterimages repeat at the delay time, each quieter, like the echoes.
function drawGhosts(t) {
  const ctx = drawingContext;
  ghosts = ghosts.filter((g) => t - g.t < ECHO_TIME * 3 + 0.4);
  for (const g of ghosts) {
    for (let i = 1; i <= 3; i++) {
      const age = t - g.t - i * ECHO_TIME;
      if (age < 0 || age > 0.4) continue;
      ctx.globalAlpha = 0.3 * Math.pow(0.5, i - 1) * (1 - age / 0.4);
      image(ghost, g.x * width, g.y * width, lw * width, lh * width);
    }
  }
  ctx.globalAlpha = 1;
}

function drawCornerFlash(t) {
  const age = t - cornerAt;
  if (age > 2.2) return;
  const k = Math.max(0, 1 - age / 0.5);
  if (k > 0) {
    noStroke();
    fill(logoHue, 25, 100, 0.3 * k * k);
    rect(0, 0, width, height);
  }
  hudCenter(cornerLabel, Math.min(1, (2.2 - age) / 0.4));
}

function drawHud(holding) {
  const inset = 24;
  hudTag(`bounces ${String(bounces).padStart(4, '0')}`, 'top-left', INK, inset);
  hudTag(`corners ${String(corners).padStart(2, '0')}`, 'top-right', corners ? INK : MUTED, inset);
  hudTag(soundOn ? '♪ sound on' : '♪ click for sound', 'bottom-left', soundOn ? INK : MUTED, inset);
  if (holding) hudTag('▶▶ x5', 'bottom-right', INK, inset);
  else if (soundOn && lastNote) hudTag(lastNote, 'bottom-right', MUTED, inset);
}


/* Sound ------------------------------------------------------------------- */

function buildAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();

  const out = ctx.createGain();
  out.gain.value = 0;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -12;
  limiter.ratio.value = 8;
  out.connect(limiter);
  limiter.connect(ctx.destination);

  // Every voice lands on the bus: dry, plus sends to delay and reverb.
  const bus = ctx.createGain();
  bus.connect(out);

  // Ping-pong delay; its time also paces the visual afterimages.
  const send = ctx.createGain();
  send.gain.value = 0.3;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2200;
  const left = ctx.createDelay(1);
  const right = ctx.createDelay(1);
  left.delayTime.value = ECHO_TIME;
  right.delayTime.value = ECHO_TIME;
  const feedbackL = ctx.createGain();
  const feedbackR = ctx.createGain();
  feedbackL.gain.value = 0.42;
  feedbackR.gain.value = 0.42;
  const merge = ctx.createChannelMerger(2);
  bus.connect(send);
  send.connect(tone);
  tone.connect(left);
  left.connect(feedbackL);
  feedbackL.connect(right);
  right.connect(feedbackR);
  feedbackR.connect(left);
  left.connect(merge, 0, 0);
  right.connect(merge, 0, 1);
  merge.connect(out);

  // Reverb from a generated impulse: a few seconds of decaying noise.
  const verb = ctx.createConvolver();
  verb.buffer = impulse(ctx, 2.8);
  const verbSend = ctx.createGain();
  verbSend.gain.value = 0.3;
  bus.connect(verbSend);
  verbSend.connect(verb);
  verb.connect(out);

  return { ctx, out, bus };
}

function impulse(ctx, seconds) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
  }
  return buffer;
}

// A soft pluck: triangle body plus a sine an octave up, through a lowpass
// that closes as the note decays, panned to where the logo is.
function voice(midi, pan, { gain = 0.2, decay = 1.3, when = 0 } = {}) {
  const { ctx, bus } = audio;
  const t = ctx.currentTime + when;
  const f = 440 * Math.pow(2, (midi - 69) / 12);

  const body = ctx.createOscillator();
  body.type = 'triangle';
  body.frequency.value = f;
  const air = ctx.createOscillator();
  air.frequency.value = f * 2;
  const airLevel = ctx.createGain();
  airLevel.gain.value = 0.3;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 2;
  filter.frequency.setValueAtTime(Math.min(12000, f * 10), t);
  filter.frequency.exponentialRampToValueAtTime(f * 1.5, t + decay * 0.7);

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.005);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + decay);

  body.connect(filter);
  air.connect(airLevel);
  airLevel.connect(filter);
  filter.connect(amp);
  if (ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    amp.connect(panner);
    panner.connect(bus);
  } else {
    amp.connect(bus);
  }

  body.start(t);
  air.start(t);
  body.stop(t + decay + 0.05);
  air.stop(t + decay + 0.05);
}

function play(midi, pan, options) {
  if (soundOn && audio) voice(midi, pan, options);
}

// Corner hit: a spread Cmaj9, rolled across the stereo field.
function chord() {
  [48, 55, 64, 71, 74, 79].forEach((midi, i) => {
    play(midi, -0.8 + i * 0.32, { gain: 0.12, decay: 2.6, when: i * 0.05 });
  });
}

function toggleSound() {
  if (!audio) audio = buildAudio();
  if (!audio) return;
  soundOn = !soundOn;
  const { ctx, out } = audio;
  if (soundOn) ctx.resume();
  out.gain.cancelScheduledValues(ctx.currentTime);
  out.gain.setTargetAtTime(soundOn ? 1 : 0, ctx.currentTime, 0.04);
  if (soundOn) {
    play(72, 0, { gain: 0.1, decay: 0.5 });
    play(79, 0, { gain: 0.08, decay: 0.7, when: 0.08 });
  } else {
    // Let the tails fade, then park the audio thread.
    setTimeout(() => { if (!soundOn) ctx.suspend(); }, 1200);
  }
}


/* Input ------------------------------------------------------------------- */

function mousePressed() {
  if (!pointerOnCanvas()) return;
  pressedAt = millis();
  return false;
}

function mouseReleased() {
  if (!pressedAt) return;
  const tap = millis() - pressedAt < HOLD_MS;
  pressedAt = 0;
  if (tap) toggleSound();
}

function keyPressed() {
  if (key === ' ') {
    toggleSound();
    return false;
  }
}
