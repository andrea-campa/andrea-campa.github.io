let webcam;

function setup() {
  const size = makeSquareCanvas();
  pixelDensity(1);
  webcam = createCapture(VIDEO, () => {
    const hint = document.getElementById('cam-hint');
    if (hint) hint.style.display = 'none';
  });
  webcam.size(size, size);
  webcam.hide();
}

// Swap the RGBA values of two pixels in a pixel array of the given row width.
function swapPixels(pixels, rowWidth, x1, y1, x2, y2) {
  const index1 = (x1 + y1 * rowWidth) * 4;
  const index2 = (x2 + y2 * rowWidth) * 4;
  for (let i = 0; i < 4; i++) {
    const temp = pixels[index1 + i];
    pixels[index1 + i] = pixels[index2 + i];
    pixels[index2 + i] = temp;
  }
}

function draw() {
  background(0);
  webcam.loadPixels();
  if (webcam.pixels.length === 0) return;

  // Mirror-swap 10px stripes across the vertical centre line.
  for (let y = 0; y < webcam.height; y++) {
    for (let x = 0; x < webcam.width / 2; x++) {
      if (x % 20 < 10) {
        swapPixels(webcam.pixels, webcam.width, x, y, webcam.width - 1 - x, y);
      }
    }
  }
  webcam.updatePixels();
  image(webcam, 0, 0, webcam.width, webcam.height);
  filter(INVERT);
}

function windowResized() {
  const size = squareSize();
  resizeCanvas(size, size);
  webcam.size(size, size);
}
