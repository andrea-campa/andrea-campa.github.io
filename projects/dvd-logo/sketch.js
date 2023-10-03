let playing = false;

function preload() {
  dvd = loadImage('dvd_logo.png');
}

function setup() {
  //mimics the autoplay policy
  getAudioContext().suspend();

  if (windowWidth>windowHeight) {
    var myCanvas = createCanvas(windowHeight/1.3, windowHeight/1.3);
  } else { 
    var myCanvas = createCanvas(windowWidth, windowWidth);
  }
  myCanvas.parent("canvas-container");

  background(255, 204, 0);

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
  env.setADSR(0.005, 0.5, 0, 0); // Set attack, decay, sustain, release times
  env.setRange(0.8, 0); // Set the amplitude range (maximum and minimum)

  //delay
  delay = new p5.Delay();

  //reverb
  reverb = new p5.Reverb();

  //delay gain
  delayOutput = new p5.Gain();

  
  x = 10;
  y = 10;
  if (windowWidth>windowHeight) {
    xspeed = windowHeight/150;
    yspeed = windowHeight/150;
    xdim = windowHeight/6;
    ydim = windowHeight/8;
  } else { 
    xspeed = windowWidth/150;
    yspeed = windowWidth/150;
    xdim = windowWidth/5;
    ydim = windowWidth/6.5;
  }
  
  
  r = floor(random(256));
  g = floor(random(256));
  b = floor(random(256));
}

function playsound() {
  randomIndex = floor(random(cMajorScale.length));
  osc.freq(cMajorScale[randomIndex]/5);
  env.play(osc);
  filter.freq(500);
  filter.res(20);
  distortion.process(osc, 0.01);
  delay.process(distortion, 0.4, 0.4); //time in secs, feedback
  reverb.process(distortion, 5, 5); //Adjust the reverb time and decay rate 
}

function randomBackground() {
  // Generate random values for red, green, and blue components (0-255)
  r = floor(random(256));
  g = floor(random(256));
  b = floor(random(256));

  // Set the background color using the random values
}

function draw() {
  background(r, g, b);
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

function mouseClicked() {
  if (playing) {
    osc.stop() // Stop the oscillator by setting amplitude to 0
    playing = false;
  } else {
    userStartAudio();
    osc.start();
    playing = true;
  }
}
