var navID = document.getElementById("nav-id");
var arrowID = document.getElementById("arrow");
var viewportHeight = window.innerHeight;
let i = 0;

function navSpace () {    
    navID.style.height = viewportHeight + "px";
};

function arrowBuilder () {    
    arrowID.style.top = viewportHeight - 50 + "px";
};

function arrowMove () {
    arrowID.style.top = viewportHeight - 50 - i + "px";
  
    if (i<20) {
      i+=20;
    } else {
      i-=20;
    }
  
    return 1;
};

window.addEventListener('scroll', () => {
  arrowID.style.opacity = '0'; // Hide the div by setting its opacity to 0
  setTimeout(() => {
    arrowID.style.display = 'none'; // Optionally, hide the div completely by setting its display to 'none' after a brief delay
  }, 500); // Adjust the delay (in milliseconds) as needed
});

navSpace();
arrowBuilder();
setInterval(arrowMove, 1000);
