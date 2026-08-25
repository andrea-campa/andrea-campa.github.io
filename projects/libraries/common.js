// Shared helpers for the p5.js sketches.

// Square canvas sized to the viewport: the short side in landscape,
// full width in portrait.
function squareSize() {
  return windowWidth > windowHeight
    ? Math.round(windowHeight / 1.3)
    : Math.round(windowWidth);
}

// Creates the square canvas and parents it to #canvas-container.
// Returns the side length so sketches can size other things to it.
function makeSquareCanvas() {
  const size = squareSize();
  const canvas = createCanvas(size, size);
  canvas.parent('canvas-container');
  return size;
}

// Default resize behaviour for non-webcam sketches. Webcam sketches
// define their own windowResized (loaded after this file) to also
// resize the capture, overriding this one.
function windowResized() {
  const size = squareSize();
  resizeCanvas(size, size);
}
