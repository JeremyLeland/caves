import { GroundInfos, PropInfos, TileMap } from '../TileMap.js';

//setGridStyle( document.body, 'rgba(100, 100, 100, .7)' );

const ui = document.getElementById( 'palette' );

enum Layer { Ground, Prop };

const tileInfos = [];
let activeTileIndex = 1;
let activeLayer = Layer.Ground;

const removeBefore = document.createElement( 'button' );
removeBefore.innerText = '-';
removeBefore.onclick = () => {
  tileMap.deleteCol( 0 );
  topRuler.style.width = `${tileMap.groundCanvas.width}`
};
ui.appendChild( removeBefore );
ui.appendChild( document.createElement( 'br' ) );

const addBefore = document.createElement( 'button' );
addBefore.innerText = '+';
addBefore.onclick = () => {
  tileMap.insertCol( 0 );
  topRuler.style.width = `${tileMap.groundCanvas.width}`
};
ui.appendChild( addBefore );
ui.appendChild( document.createElement( 'br' ) );

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

const editor = document.getElementById( 'editor' );

const topRuler = document.getElementById( 'topRuler' );
const leftRuler = document.getElementById( 'leftRuler' );
topRuler.style.width = `${ tileMap.groundCanvas.width }`
leftRuler.style.height = `${ tileMap.groundCanvas.height }`

const insertColButton = document.getElementById( 'insertColumn' );
const deleteColButton = document.getElementById( 'deleteColumn' );
const insertRowButton = document.getElementById( 'insertRow' );
const deleteRowButton = document.getElementById( 'deleteRow' );

editor.appendChild( tileMap.groundCanvas );
editor.appendChild( tileMap.propCanvas );
editor.appendChild( tileMap.gridCanvas );

const gridCursor = getGridCursor();
//document.body.appendChild( gridCursor );

//document.body.appendChild( ui );

let mouseDown = false;
editor.onmousedown = () => {
  mouseDown = true;
  doMouse();
}
editor.onmouseup   = () => mouseDown = false;

let lastCol = -1, lastRow = -1;
let mouseCol = 0, mouseRow = 0;
editor.onmousemove = ( e: MouseEvent ) => {
  mouseCol = Math.floor( e.clientX / tileMap.tileSize );
  mouseRow = Math.floor( e.clientY / tileMap.tileSize );

  insertColButton.style.left = `${mouseCol * tileMap.tileSize}`;
  insertRowButton.style.top  = `${mouseRow * tileMap.tileSize}`;

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