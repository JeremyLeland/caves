import { GroundInfos, PropInfos, TileMap } from '../TileMap.js';

setGridStyle( document.body, 'rgba(100, 100, 100, .7)' );

const ui = document.createElement( 'div' );
ui.style.position = 'absolute';
ui.style.right = '0';

enum Layer { Ground, Prop };

const tileInfos = [];
let activeTileIndex = 1;
let activeLayer = Layer.Ground;

// TODO: Generalize all this
ui.appendChild( document.createTextNode( 'Ground' ) );
ui.appendChild( document.createElement( 'br' ) );
let index = 0;
for ( let name in GroundInfos ) {
  const button = document.createElement( 'button' );
  button.innerText = name;
  
  const tileIndex = index;
  button.onclick = () => { 
    activeTileIndex = tileIndex;
    activeLayer = Layer.Ground;
  }
  ui.appendChild( button );
  ui.appendChild( document.createElement( 'br' ) );

  tileInfos.push( GroundInfos[ name ]);
  index ++;
}

ui.appendChild( document.createTextNode( 'Prop' ) );
ui.appendChild( document.createElement( 'br' ) );
const button = document.createElement( 'button' );
button.innerText = 'Clear';

button.onclick = () => { 
  activeTileIndex = null;
  activeLayer = Layer.Prop;
}
ui.appendChild( button );
ui.appendChild( document.createElement( 'br' ) );

for ( let name in PropInfos ) {
  const button = document.createElement( 'button' );
  button.innerText = name;
  
  const tileIndex = index;
  button.onclick = () => { 
    activeTileIndex = tileIndex;
    activeLayer = Layer.Prop;
  }
  ui.appendChild( button );
  ui.appendChild( document.createElement( 'br' ) );

  tileInfos.push( PropInfos[ name ]);
  index ++;
}

const tileMap = new TileMap( 10, 10, tileInfos );

tileMap.groundCanvas.style.position = 'absolute';
document.body.appendChild( tileMap.groundCanvas );

const propCanvas = document.createElement( 'canvas' );
propCanvas.width = tileMap.groundCanvas.width;
propCanvas.height = tileMap.groundCanvas.height;
tileMap.propCanvas = propCanvas;

propCanvas.style.position = 'absolute';
document.body.appendChild( propCanvas );

const gridCursor = getGridCursor();
document.body.appendChild( gridCursor );

document.body.appendChild( ui );

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

    switch ( activeLayer ) {
      case Layer.Ground:
        tileMap.setGround( mouseCol, mouseRow, activeTileIndex ); 
        break;
      case Layer.Prop:
        tileMap.setProp( mouseCol, mouseRow, activeTileIndex );
        break;
    }
  }
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