
function setup() {
  if (windowWidth>windowHeight) {
    var myCanvas = createCanvas(round(windowHeight/1.3), round(windowHeight/1.3));
  } else { 
    var myCanvas = createCanvas(round(windowWidth), round(windowWidth));
  }
  myCanvas.parent("canvas-container");

  webcam = createCapture(VIDEO);
	webcam.hide();
}

function draw() {

  background(0);
  webcam.loadPixels();
  var stepSize = 15;

  for (var y=0; y<=webcam.height; y+=stepSize) {
    for (var x=0; x<=webcam.width; x+=stepSize) {
      var i = y * webcam.width + x;
      var darkness = (255 - webcam.pixels[i*4]) / 255;
      var radius = stepSize * darkness;
      var xmap = map(x,0,webcam.width,0, width);
      var ymap = map(y,0,webcam.height,0, height);
      square(width-xmap, ymap, radius);
    }
  }
}