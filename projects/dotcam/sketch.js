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

function draw() {
  background(0);
  webcam.loadPixels();
  if (webcam.pixels.length === 0) return;

  const stepSize = 15;
  for (let y = 0; y <= webcam.height; y += stepSize) {
    for (let x = 0; x <= webcam.width; x += stepSize) {
      const i = y * webcam.width + x;
      const darkness = (255 - webcam.pixels[i * 4]) / 255;
      const radius = stepSize * darkness;
      square(width - x, y, radius); // mirror horizontally
    }
  }
}

function windowResized() {
  const size = squareSize();
  resizeCanvas(size, size);
  webcam.size(size, size);
}
