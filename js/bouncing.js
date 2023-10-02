
let i = 0;
var elementToMove = document.getElementById("nav-id");
var viewportHeight = window.innerHeight;

function builder () {    
    elementToMove.style.top = viewportHeight - 100 + "px";
};

function moveElement() {
  elementToMove.style.top = viewportHeight - 100 - i + "px";

  if (i<20) {
    i+=20;
  } else {
    i-=20;
  }

  return 1;
}
builder();
setInterval(moveElement, 1000);
