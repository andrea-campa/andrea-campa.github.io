
function setup() {
  if (windowWidth>windowHeight) {
    var myCanvas = createCanvas(round(windowHeight/1.3), round(windowHeight/1.3));
  } else { 
    var myCanvas = createCanvas(round(windowWidth), round(windowWidth));
  }
  pixelDensity(1);
  webcam = createCapture(VIDEO);
  if (windowWidth>windowHeight) {
    webcam.size(windowHeight/1.3,windowHeight/1.3)
  } else { 
    webcam.size(windowWidth,windowWidth)
  }
  myCanvas.parent("canvas-container");
	webcam.hide();
}

function swapPixels(pixelArray, x1, y1, x2, y2) {
  // Calculate the indices for the two pixels
  let index1 = (x1 + y1 * width) * 4;
  let index2 = (x2 + y2 * width) * 4;

  // Swap the color values (R, G, B, and A) of the two pixels
  for (let i = 0; i < 4; i++) {
    let temp = pixelArray[index1 + i];
    pixelArray[index1 + i] = pixelArray[index2 + i];
    pixelArray[index2 + i] = temp;
  }
}

function draw() {

  background(0);
  webcam.loadPixels();
  var stepSize = 1;

  for (var y=0; y<=webcam.height; y+=stepSize) {
    for (var x=0; x<=webcam.width; x+=stepSize) {
      var i = y * webcam.width + x;
      
      let r = webcam.pixels[i];
      let g = webcam.pixels[i + 1];
      let b = webcam.pixels[i + 2];

      if (x%20<10 && x<webcam.width/2) {
        swapPixels(webcam.pixels, x, y,webcam.width-x , y)
      }

      
    }
  }
  webcam.updatePixels();
  image(webcam, 0, 0, webcam.width, webcam.height);
  filter(INVERT);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}