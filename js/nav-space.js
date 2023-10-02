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
  }

navSpace();
arrowBuilder();
setInterval(arrowMove, 1000);
