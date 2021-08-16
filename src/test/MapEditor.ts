import { TileInfos, TileMap } from '../TileMap.js';

setGridStyle( document.body, 'rgba(100, 100, 100, .7)' );

const gridCursor = getGridCursor();
document.body.appendChild( gridCursor );

const ui = document.createElement( 'div' );
ui.style.position = 'absolute';
ui.style.right = '0';
document.body.appendChild( ui );

const tileInfoNames = [ 'Dirt', 'Grass', 'Snow' ];
let activeTileIndex = 1;

tileInfoNames.forEach( ( name, index ) => {
  const button = document.createElement( 'button' );
  button.innerText = name;
  button.onclick = () => activeTileIndex = index;
  ui.appendChild( button );
});

const tileMap = new TileMap( 10, 10, tileInfoNames.map( e => TileInfos[ e ] ) );

document.body.appendChild( tileMap.canvas );

let mouseDown = false;
window.onmousedown = () => {
  mouseDown = true;
  doMouse();
}
window.onmouseup   = () => mouseDown = false;

let lastCol = -1, lastRow = -1;
let mouseCol = 0, mouseRow = 0;
window.onmousemove = ( e: MouseEvent ) => {
  mouseCol = Math.floor( e.clientX / tileMap.tileSize );
  mouseRow = Math.floor( e.clientY / tileMap.tileSize );

  gridCursor.style.left = `${mouseCol * tileMap.tileSize}`;
  gridCursor.style.top  = `${mouseRow * tileMap.tileSize}`;

  if ( mouseDown ) {
    doMouse();
  }
}

function doMouse() {
  if ( mouseCol != lastCol || mouseRow != lastRow ) {
    lastCol = mouseCol;
    lastRow = mouseRow;

    tileMap.setTileAt( mouseCol, mouseRow, activeTileIndex );
  }
}

function setGridStyle( element: HTMLElement, color: string ) {
  element.style.backgroundImage = `
  linear-gradient(${ color } 1px, transparent 1px, transparent 31px, ${ color } 1px),
  linear-gradient(90deg, ${ color } 1px, transparent 1px, transparent 31px, ${ color } 1px)
  `;
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