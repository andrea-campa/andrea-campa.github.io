function setup() {
  createCanvas(windowWidth, windowHeight);
}
let time = 0;
function draw() {
  background(0);
  noStroke();
  
  /* for (let i = 10; i < windowWidth; i+=20) {
    for (let j = 10; j < windowHeight; j+=20) {
      
      noiseDetail(20, 0.1);
      fill(255,255,255,noise(i*100+time,j*100+time)*255);
      circle(i,j,3);
    }
  }
  time += 0.01; */

  for (let i = 10; i < windowWidth; i+=20) {
    for (let j = 10; j < windowHeight; j+=20) {
      
      noiseDetail(20, 0.1);
      fill(255);
      circle(i,noise(i+time,j+time)*windowWidth,3);
    }
  }
  time += 0.001;


/*   for (let i = 10; i < windowWidth; i+=20) {
    for (let j = 10; j < windowHeight; j+=20) {
      
      noiseDetail(20, 0.1);
      fill(255);
      circle(i+noise(i+time,j+time)*400,j,5);
    }
  }
  time += 0.001; */
}
