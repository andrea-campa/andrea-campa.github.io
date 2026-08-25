let time = 0;

function setup() {
  makeSquareCanvas();
}

function draw() {
  background(30);
  noStroke();

  for (let i = 10; i < width; i += 20) {
    for (let j = 10; j < height; j += 20) {
      circle(i, noise(i + time, j + time) * width, 3);
    }
  }
  time += 0.001;
}
