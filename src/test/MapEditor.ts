import { TileInfos, TileMap } from '../TileMap.js';

// Background grid
const gridColor = 'rgba(100, 100, 100, .7)';
document.body.style.backgroundImage = `
  linear-gradient(${ gridColor } 1px, transparent 1px),
  linear-gradient(90deg, ${ gridColor } 1px, transparent 1px)
`;
document.body.style.backgroundSize = '32px 32px';


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

let mouseX = -1, mouseY = -1;
window.onmousemove = ( e: MouseEvent ) => {
  mouseX = e.clientX;
  mouseY = e.clientY;

  if ( mouseDown ) {
    doMouse();
  }
}

let lastCol = -1, lastRow = -1;
function doMouse() {
  const col = Math.floor( mouseX / tileMap.tileSize );
  const row = Math.floor( mouseY / tileMap.tileSize );

  if ( col != lastCol || row != lastRow ) {
    lastCol = col;
    lastRow = row;

    tileMap.setTileAt( col, row, 1 );
  }
}