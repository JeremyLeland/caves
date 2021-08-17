const TILE_SIZE = 32;

const image = new Image();
image.src = '../images/plants.png';
document.body.appendChild( image );

setGridStyle( document.body, 'rgba(100, 100, 100, .7)' );

const gridCursor = getGridCursor();
document.body.appendChild( gridCursor );


let mouseDown = false;
window.onmousedown = () => {
  mouseDown = true;
}
window.onmouseup   = () => mouseDown = false;

let lastCol = -1, lastRow = -1;
let mouseCol = 0, mouseRow = 0;
window.onmousemove = ( e: MouseEvent ) => {
  mouseCol = Math.floor( e.pageX / TILE_SIZE );
  mouseRow = Math.floor( e.pageY / TILE_SIZE );

  gridCursor.style.left = `${mouseCol * TILE_SIZE}`;
  gridCursor.style.top  = `${mouseRow * TILE_SIZE}`;

  gridCursor.innerText = `${mouseCol},${mouseRow}`;
}

function setGridStyle( element: HTMLElement, color: string ) {
  element.style.backgroundImage =
    [ 0, 90, 180, 270 ].map( deg => 
      `linear-gradient( ${ deg }deg, ${ color } 1px, transparent 1px )`
    ).join( ',' );
  element.style.backgroundSize = '32px 32px';
}

function getGridCursor() {
  const div = document.createElement( 'div' );
  div.style.position = 'absolute';
  div.style.width = '32px';
  div.style.height = '32px';
  setGridStyle( div, 'white' );
  return div;
}