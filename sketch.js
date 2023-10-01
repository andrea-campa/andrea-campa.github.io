function preload() {
  dvd = loadImage('dvd_logo.png');
}

function setup() {
  // mimics the autoplay policy
  getAudioContext().suspend();

  let p5js_1 = createCanvas(500, 400);
  p5js_1.parent('p5js_1');

  //scale
  cMajorScale = [261.63, 293.66, 349.23, 392.00];

  //osc
  osc = new p5.Oscillator(); // Create a new oscillator
  osc.setType('sine'); // Set the oscillator waveform to sine wave (pure tone)
  osc.freq(0); // Set the frequency to 440 Hz (A4)
  osc.start(); // Start the oscillator

  //filter
  filter = new p5.BandPass();
  osc.disconnect();
  osc.connect(filter);
  
  // Create a p5.Distortion object
  distortion = new p5.Distortion();
  filter.disconnect();
  filter.connect(distortion);

  //amp env
  env = new p5.Env();
  env.setADSR(0, 0.5, 0, 0); // Set attack, decay, sustain, release times
  env.setRange(0.8, 0); // Set the amplitude range (maximum and minimum)

  //delay
  delay = new p5.Delay();

  //reverb
  reverb = new p5.Reverb();

  //delay gain
  delayOutput = new p5.Gain();

  
  x = 10;
  y = 10;
  xspeed = 10;
  yspeed = 10;
  xdim = 100;
  ydim = 100;

}

function playsound() {
  randomIndex = floor(random(cMajorScale.length));
  osc.freq(cMajorScale[randomIndex]/5);
  env.play(osc);
  filter.freq(500);
  filter.res(20);
  distortion.process(osc, 0.01);
  delay.process(distortion, 0.5, 0.2); //time in secs, feedback
  //reverb.process(distortion, 5, 5); //Adjust the reverb time and decay rate 
}

function randomBackground() {
  // Generate random values for red, green, and blue components (0-255)
  let r = floor(random(256));
  let g = floor(random(256));
  let b = floor(random(256));

  // Set the background color using the random values
  background(r, g, b);
}

function draw() {
  image(dvd, x, y, xdim, ydim);
  
  x += xspeed;
  y += yspeed;

  if (x + xdim >= width) {
    xspeed = -xspeed;
    x = width - xdim;
    // pickColor();
    randomBackground();    
    playsound();
  } else if (x <= 0) {
    xspeed = -xspeed;
    x = 0;
    // pickColor();
    randomBackground();    
    playsound();
  }

  if (y + ydim >= height) {
    yspeed = -yspeed;
    y = height - ydim;
    // pickColor();
    randomBackground();    
    playsound();
  } else if (y <= 0) {
    yspeed = -yspeed;
    y = 0;
    // pickColor();
    randomBackground();    
    playsound();
  }
}

function mousePressed() {
  userStartAudio();
}
