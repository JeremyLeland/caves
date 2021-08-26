const TILE_SIZE = 32;

const image = new Image();
image.src = '../images/plants.png';
document.body.appendChild( image );

setGridStyle( image, 'rgba(100, 100, 100, .7)' );

const gridCursor = getGridCursor();
document.body.appendChild( gridCursor );

/*const dropzone = document.createElement( 'div' );
dropzone.style.background = 'blue';
dropzone.style.width = '100px';
dropzone.style.height = '100px';
document.body.appendChild( dropzone );
*/

window.ondragover = ( event ) => {
  event.preventDefault();
}
window.ondrop = ( event ) => {
  event.preventDefault();

  if ( event.dataTransfer.items ) {
    for ( let i = 0; i < event.dataTransfer.items.length; i ++ ) {
      if ( event.dataTransfer.items[ i ].kind === 'file' ) {
        const file = event.dataTransfer.items[ i ].getAsFile();
        const reader = new FileReader();
        reader.onloadend = () => {
          image.src = reader.result as string;
        };
        reader.readAsDataURL( file );
      }
    }
  }
  else {
    for ( let i = 0; i < event.dataTransfer.files.length; i ++ ) {
      image.src = event.dataTransfer.files[ i ].name;
    }
  }
}

let mouseDown = false;
window.onmousedown = () => mouseDown = true;
window.onmouseup   = () => mouseDown = false;

let lastCol = -1, lastRow = -1;
let mouseCol = 0, mouseRow = 0;
image.onmousemove = ( e: MouseEvent ) => {
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