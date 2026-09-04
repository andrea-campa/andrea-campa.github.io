// StripeCam: the webcam cut into stripes that swap with their mirror image
// and flip negative. The stripes are symmetric about the centre line and
// slowly slide outward. Move across to set their width.

const RES = 0.5;               // processing resolution, relative to the canvas
const DRIFT = 5;               // stripe slide speed, working pixels per second

let cam;
let work;                      // working canvas at RES
let workCtx;
let output;                    // processed pixels, written back into work
let stripe = 7;                // stripe width, working pixels
let stripeTarget = 7;
let drift = 0;

function setup() {
  makeSquareCanvas();
  describe('Your webcam in greyscale, cut into vertical stripes that swap with their mirror image and turn negative.');
  cam = startCamera();
  work = document.createElement('canvas');
  workCtx = work.getContext('2d', { willReadFrequently: true });
  sizeWork();
}

function windowResized() {
  const size = squareSize();
  resizeCanvas(size, size);
  sizeWork();
}

function sizeWork() {
  const n = Math.max(120, Math.round(width * RES));
  work.width = n;
  work.height = n;
  output = workCtx.createImageData(n, n);
}

function draw() {
  const n = work.width;
  const t = millis() / 1000;
  const dt = Math.min(deltaTime / 1000, 0.05);

  if (pointerOnCanvas()) stripeTarget = map(mouseX, 0, width, 2, n / 5, true);
  stripe += (stripeTarget - stripe) * 0.12;
  drift += dt * DRIFT;

  if (cam.live) drawSquareCrop(workCtx, cam.video, cam.video.videoWidth, cam.video.videoHeight, n);
  else drawTestSignal(workCtx, n, t);
  const src = workCtx.getImageData(0, 0, n, n).data;
  const dst = output.data;

  const mid = (n - 1) / 2;
  for (let y = 0; y < n; y++) {
    const row = y * n;
    for (let x = 0; x < n; x++) {
      // Bands are measured from the centre line, so a stripe and its
      // mirror always swap as a pair.
      const band = Math.floor((Math.abs(x - mid) + drift) / stripe);
      const swapped = (band & 1) === 0;
      const sx = swapped ? n - 1 - x : x;
      const so = (row + sx) * 4;

      const l = 0.2126 * src[so] + 0.7152 * src[so + 1] + 0.0722 * src[so + 2];
      const v = swapped ? 255 - l : l;

      const o = (row + x) * 4;
      dst[o] = v;
      dst[o + 1] = v;
      dst[o + 2] = v;
      dst[o + 3] = 255;
    }
  }
  workCtx.putImageData(output, 0, 0);

  // Scale up without smoothing: hard pixel edges suit the stripes.
  const ctx = drawingContext;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(work, 0, 0, width, height);

  hudTag(cam.live ? '● live' : '○ test signal', 'top-left', cam.live ? INK : MUTED);
  hudTag(`stripes ${Math.round(stripe / RES)}px`, 'bottom-left');
}

// Keep the page still while dragging on a touch screen.
function mousePressed() {
  if (pointerOnCanvas()) return false;
}
