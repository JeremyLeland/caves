import { PathfindingNode } from '../Pathfinding.js';
import { GroundInfos, PropInfos, TileInfo, TileMap } from '../TileMap.js';

//setGridStyle( document.body, 'rgba(100, 100, 100, .7)' );

const ui = document.getElementById( 'palette' );

enum Layer { Ground, Prop };

const tileInfos = [];
// TODO: Make this a reference to actual TileInfo, since we're trying to use those now
let activeTileInfo = GroundInfos.Rock;
let activeLayer = Layer.Ground;

[ 'Pathfinding', 'Grid' ].forEach( e => {
  const checkbox = document.createElement( 'input' );
  checkbox.id = `toggle${e}`
  checkbox.type = 'checkbox';
  checkbox.checked = true;
  checkbox.onchange = () => toggleOverlay( e, checkbox.checked );
  const label = document.createElement( 'label' );
  label.htmlFor = checkbox.id;
  label.innerText = e;
  ui.appendChild( checkbox );
  ui.appendChild( label );
  ui.appendChild( document.createElement( 'br' ) );
});


// TODO: Generalize all this
ui.appendChild( document.createTextNode( 'Ground' ) );
ui.appendChild( document.createElement( 'br' ) );
let index = 0;
for ( let name in GroundInfos ) {
  const button = document.createElement( 'button' );
  button.innerText = name;
  
  const tileInfo = GroundInfos[ name ];
  button.onclick = () => { 
    activeTileInfo = tileInfo;
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
  activeTileInfo = null;
  activeLayer = Layer.Prop;
}
ui.appendChild( button );
ui.appendChild( document.createElement( 'br' ) );

for ( let name in PropInfos ) {
  const button = document.createElement( 'button' );
  button.innerText = name;
  
  const tileInfo = PropInfos[ name ];
  button.onclick = () => { 
    activeTileInfo = tileInfo;
    activeLayer = Layer.Prop;
  }
  ui.appendChild( button );
  ui.appendChild( document.createElement( 'br' ) );

  tileInfos.push( PropInfos[ name ]);
  index ++;
}

const tileMap = await TileMap.fromJson({ cols: 10, rows: 10, tileInfos: tileInfos });

const editor = document.getElementById( 'editor' );
const grid = document.getElementById( 'grid' );
const topRuler = document.getElementById( 'topRuler' );
const leftRuler = document.getElementById( 'leftRuler' );

const insertColButton = document.getElementById( 'insertColumn' );
const deleteColButton = document.getElementById( 'deleteColumn' );
const insertRowButton = document.getElementById( 'insertRow' );
const deleteRowButton = document.getElementById( 'deleteRow' );

insertColButton.onclick = () => {
  tileMap.insertCol( mouseCol );
  mapUpdated();
};
deleteColButton.onclick = () => {
  tileMap.deleteCol( mouseCol );
  mapUpdated();
};
insertRowButton.onclick = () => {
  tileMap.insertRow( mouseRow );
  mapUpdated();
};
deleteRowButton.onclick = () => {
  tileMap.deleteRow ( mouseRow );
  mapUpdated();
};

editor.appendChild( tileMap.groundCanvas );
editor.appendChild( tileMap.propCanvas );

const pathfindingCanvas = document.createElement( 'canvas' );
editor.appendChild( pathfindingCanvas );

const gridCursor = getGridCursor();
editor.appendChild( gridCursor );

mapUpdated();

let mouseDown = false;
grid.onmousedown = () => {
  mouseDown = true;
  doMouse();
}
grid.onmouseup   = () => mouseDown = false;

let lastCol = -1, lastRow = -1;
let mouseCol = 0, mouseRow = 0;
grid.onmousemove = ( e: MouseEvent ) => {
  mouseCol = Math.floor( e.offsetX / tileMap.tileSize );
  mouseRow = Math.floor( e.offsetY / tileMap.tileSize );

  insertColButton.style.left = `${ mouseCol * tileMap.tileSize }`;
  insertRowButton.style.top  = `${ mouseRow * tileMap.tileSize }`;

  deleteColButton.style.left = `${ ( mouseCol + 0.5 ) * tileMap.tileSize }`
  deleteRowButton.style.top  = `${ ( mouseRow + 0.5 ) * tileMap.tileSize }`

  gridCursor.style.left = `${ ( mouseCol + 0.5 ) * tileMap.tileSize }`;
  gridCursor.style.top  = `${ ( mouseRow + 0.5 ) * tileMap.tileSize }`;

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
        tileMap.setGround( mouseCol, mouseRow, activeTileInfo ); 
        break;
      case Layer.Prop:
        tileMap.setProp( mouseCol, mouseRow, activeTileInfo );
        break;
    }

    updatePathfinding();
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

function mapUpdated() {
  updateWidths();
  updatePathfinding();

  console.log( tileMap.toJson() );
}

function updateWidths() {
  topRuler.style.width = `${tileMap.groundCanvas.width}`
  leftRuler.style.height = `${ tileMap.groundCanvas.height }`
  grid.style.width = `${tileMap.groundCanvas.width}`;
  grid.style.height = `${ tileMap.groundCanvas.height }`;
}

function updatePathfinding() {
  pathfindingCanvas.width = tileMap.groundCanvas.width;
  pathfindingCanvas.height = tileMap.groundCanvas.height;
  const pathfindingCtx = pathfindingCanvas.getContext( '2d' );

  pathfindingCtx.globalAlpha = 0.3;
  PathfindingNode.drawNodes( pathfindingCtx, tileMap.pathfindingNodes );
}

function toggleOverlay( label, value ) {
  if ( label == 'Pathfinding' ) {
    pathfindingCanvas.style.display = value ? 'inline' : 'none';
  }
  if ( label == 'Grid' ) {
    grid.style.backgroundSize = value ? '32px 32px' : '0px 0px';
  }
}