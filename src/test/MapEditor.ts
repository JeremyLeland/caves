import { TileInfos, TileMap } from '../TileMap.js';

setGridStyle( document.body, 'rgba(100, 100, 100, .7)' );

const currentGridIndicator = document.createElement( 'div' );
currentGridIndicator.style.position = 'absolute';
currentGridIndicator.style.width = '32px';
currentGridIndicator.style.height = '32px';
setGridStyle( currentGridIndicator, 'white' );
document.body.appendChild( currentGridIndicator );

function setGridStyle( element: HTMLElement, color: string ) {
  element.style.backgroundImage = `
  linear-gradient(${ color } 1px, transparent 1px, transparent 31px, ${ color } 1px),
  linear-gradient(90deg, ${ color } 1px, transparent 1px, transparent 31px, ${ color } 1px)
  `;
  element.style.backgroundSize = '32px 32px';
}


let cols = 20, rows = 20;
let tileIndices = Array( cols * rows ).fill( 0 );

const tileMap = new TileMap( {
  cols: 10, rows: 10,
  tileMap: tileIndices,
  tiles: [ TileInfos.Dirt, TileInfos.Grass, TileInfos.Snow ],
} );

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

  currentGridIndicator.style.left = `${mouseCol * tileMap.tileSize}`;
  currentGridIndicator.style.top  = `${mouseRow * tileMap.tileSize}`;

  if ( mouseDown ) {
    doMouse();
  }
}

function doMouse() {
  if ( mouseCol != lastCol || mouseRow != lastRow ) {
    lastCol = mouseCol;
    lastRow = mouseRow;

    tileMap.setTileAt( mouseCol, mouseRow, 1 );
  }
}