let playing = false;

let dvd;
let cMajorScale;
let osc, filter, distortion, env, delay, reverb, delayOutput;
let x, y, xspeed, yspeed, xdim, ydim;
let r, g, b;

function preload() {
  dvd = loadImage('dvd_logo.png');
}

function setup() {
  // mimics the autoplay policy
  getAudioContext().suspend();

  const size = makeSquareCanvas();

  background(255, 204, 0);

  // scale
  cMajorScale = [261.63, 293.66, 349.23, 392.0];

  // osc
  osc = new p5.Oscillator();
  osc.setType('sine');
  osc.freq(0);
  osc.start();

  // filter
  filter = new p5.BandPass();
  osc.disconnect();
  osc.connect(filter);

  // distortion
  distortion = new p5.Distortion();
  filter.disconnect();
  filter.connect(distortion);

  // amp env
  env = new p5.Env();
  env.setADSR(0.005, 0.5, 0, 0);
  env.setRange(0.8, 0);

  // delay
  delay = new p5.Delay();

  // reverb
  reverb = new p5.Reverb();

  // delay gain
  delayOutput = new p5.Gain();

  x = 10;
  y = 10;
  xspeed = size / 150;
  yspeed = size / 150;
  if (windowWidth > windowHeight) {
    xdim = windowHeight / 6;
    ydim = windowHeight / 8;
  } else {
    xdim = windowWidth / 5;
    ydim = windowWidth / 6.5;
  }

  randomBackground();
}

function playsound() {
  const randomIndex = floor(random(cMajorScale.length));
  osc.freq(cMajorScale[randomIndex] / 5);
  env.play(osc);
  filter.freq(500);
  filter.res(20);
  distortion.process(osc, 0.01);
  delay.process(distortion, 0.4, 0.4); // time in secs, feedback
  reverb.process(distortion, 5, 5); // reverb time and decay rate
}

function randomBackground() {
  r = floor(random(256));
  g = floor(random(256));
  b = floor(random(256));
}

function draw() {
  background(r, g, b);
  image(dvd, x, y, xdim, ydim);
  x += xspeed;
  y += yspeed;

  if (x + xdim >= width) {
    xspeed = -xspeed;
    x = width - xdim;
    randomBackground();
    playsound();
  } else if (x <= 0) {
    xspeed = -xspeed;
    x = 0;
    randomBackground();
    playsound();
  }

  if (y + ydim >= height) {
    yspeed = -yspeed;
    y = height - ydim;
    randomBackground();
    playsound();
  } else if (y <= 0) {
    yspeed = -yspeed;
    y = 0;
    randomBackground();
    playsound();
  }
}

function mouseClicked() {
  if (playing) {
    osc.stop();
    playing = false;
  } else {
    userStartAudio();
    osc.start();
    playing = true;
  }
}
