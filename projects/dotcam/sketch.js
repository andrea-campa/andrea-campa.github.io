
function setup() {
  if (windowWidth>windowHeight) {
    var myCanvas = createCanvas(round(windowHeight/1.3), round(windowHeight/1.3));
  } else { 
    var myCanvas = createCanvas(round(windowWidth), round(windowWidth));
  }
  myCanvas.parent("canvas-container");

  const bodyID = document.getElementById("canvas-container");
  const arrowID = document.getElementById("arrow-nav");
  if (windowWidth>windowHeight) {
    bodyID.style.top = (windowHeight - windowHeight/1.3) / 2 + "px";
    bodyID.style.left = (windowWidth - windowHeight/1.3) / 2 + "px";
    //arrowID.style.top = 100 + "px";
    //arrowID.style.left = 100+ "px";
  } else { 
    bodyID.style.top = (windowHeight - windowWidth) / 2 + "px";
    bodyID.style.left = (windowWidth - windowWidth) / 2 + "px";
  }

  webcam = createCapture(VIDEO);
	webcam.hide();

}

function draw() {
  /* background(255);
  webcam.loadPixels();
  
  for (var y=0; y<=640; y+=stepSize) {
    for (var x=0; x<=540; x+=stepSize) {
      var i = y * width + x;
      var darkness = (255 - webcam.pixels[i*4]) / 255;
      var radius = stepSize * darkness;
      square(x, y, radius);
    }
  } */

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
      square(xmap, ymap, radius);
    }
  }
}