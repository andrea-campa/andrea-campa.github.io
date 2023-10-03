function setup() {
  if (windowWidth>windowHeight) {
    var myCanvas = createCanvas(windowHeight/1.3, windowHeight/1.3);
  } else { 
    var myCanvas = createCanvas(windowWidth, windowWidth);
  }
  myCanvas.parent("canvas-container");
}

let time = 0;

function draw() {
  background(30);
  noStroke();
  
  /* for (let i = 10; i < windowWidth; i+=20) {
    for (let j = 10; j < windowHeight; j+=20) {
      
      noiseDetail(20, 0.1);
      fill(255,255,255,noise(i*100+time,j*100+time)*255);
      circle(i,j,3);
    }
  }
  time += 0.01; */

/*   for (let i = 0; i < width; i+=20) {
    for (let j = 0; j < height; j+=20) {
      
      noiseDetail(20, 0.1);
      fill(255);
      circle(i,noise(i+time,j+time)*width,3);
    }
  }
  time += 0.001; */

  for (let i = 10; i < width; i+=20) {
    for (let j = 10; j < height; j+=20) {
      
      //noiseDetail(20, 0.1);
      //fill(255);
      circle(i,noise(i+time,j+time)*width,3);
    }
  }
  time += 0.001


/*   for (let i = 10; i < windowWidth; i+=20) {
    for (let j = 10; j < windowHeight; j+=20) {
      
      noiseDetail(20, 0.1);
      fill(255);
      circle(i+noise(i+time,j+time)*400,j,5);
    }
  }
  time += 0.001; */
}
