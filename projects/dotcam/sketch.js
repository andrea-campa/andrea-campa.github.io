var webcam;

function setup() {
  createCanvas(640, 540);
  webcam = createCapture(VIDEO);
	webcam.size = (1280, 720);
	webcam.hide();
  noStroke();
  fill(0);
	ellipseMode(CENTER);
}

function draw() {
  background(255);
  webcam.loadPixels();
  var stepSize = round(10);
  for (var y=0; y<=height; y+=stepSize) {
    for (var x=0; x<=width; x+=stepSize) {
      var i = y * width + x;
      var darkness = (255 - webcam.pixels[i*4]) / 255;
      var radius = stepSize * darkness;
      square(x, y, radius);
    }
  }
}