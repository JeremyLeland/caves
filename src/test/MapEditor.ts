import { PathfindingNode } from '../Pathfinding.js';
import { TileMap } from '../TileMap.js';


enum Layer { Ground, Prop, Actor };

// TODO: Fix level loading from localStorage
const tileMapJson = /*localStorage.tileMapJson ? 
  JSON.parse( localStorage.tileMapJson ) : */
  { 
    cols: 10, rows: 10, 
    tileSetPath: '../json/outsideTileset.json',
    actorSetPath: '../json/actorInfo.json'
  };

const tileMap = await TileMap.fromJson( tileMapJson );

let activeBrush = 'Rock';    // TODO: Don't hardcode this, pick one from tileMap.tileSet
let activeLayer = Layer.Ground;

const ui = document.getElementById( 'palette' );
[ 'Path', 'Grid' ].forEach( e => {
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

const saveButton = document.createElement( 'button' );
saveButton.innerText = 'Save';
saveButton.onclick = () => {
  const fileContent = JSON.stringify( tileMap.toJson() );
  const bb = new Blob([ fileContent ], { type: 'application/json' });
  const a = document.createElement( 'a' );
  a.download = 'download.txt';
  a.href = window.URL.createObjectURL( bb );
  a.click();
}
ui.appendChild( saveButton );

const clearButton = document.createElement( 'button' );
clearButton.innerText = 'Clear';
clearButton.onclick = () => {
  localStorage.clear();
};
ui.appendChild( clearButton );

// TODO: Generalize all this
ui.appendChild( document.createTextNode( 'Ground' ) );
ui.appendChild( document.createElement( 'br' ) );
for ( let name in tileMap.tileSet.ground ) {
  const button = document.createElement( 'button' );
  button.innerText = name;
  
  button.onclick = () => { 
    activeBrush = name;
    activeLayer = Layer.Ground;
  }
  ui.appendChild( button );
  ui.appendChild( document.createElement( 'br' ) );
}

ui.appendChild( document.createTextNode( 'Prop' ) );
ui.appendChild( document.createElement( 'br' ) );
const button = document.createElement( 'button' );
button.innerText = 'Clear';

button.onclick = () => { 
  activeBrush = null;
  activeLayer = Layer.Prop;
}
ui.appendChild( button );
ui.appendChild( document.createElement( 'br' ) );

for ( let name in tileMap.tileSet.props ) {
  const button = document.createElement( 'button' );
  button.innerText = name;
  
  button.onclick = () => { 
    activeBrush = name;
    activeLayer = Layer.Prop;
  }
  ui.appendChild( button );
  ui.appendChild( document.createElement( 'br' ) );
}

ui.appendChild( document.createTextNode( 'Actors' ) );
ui.appendChild( document.createElement( 'br' ) );
const skelButton = document.createElement( 'button' );
skelButton.innerText = 'Skeleton';

skelButton.onclick = () => { 
  activeBrush = 'Skeleton';
  activeLayer = Layer.Actor;
}
ui.appendChild( skelButton );
ui.appendChild( document.createElement( 'br' ) );


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
  mapResized();
};
deleteColButton.onclick = () => {
  tileMap.deleteCol( mouseCol );
  mapResized();
};
insertRowButton.onclick = () => {
  tileMap.insertRow( mouseRow );
  mapResized();
};
deleteRowButton.onclick = () => {
  tileMap.deleteRow ( mouseRow );
  mapResized();
};

const groundCanvas = document.createElement( 'canvas' );
groundCanvas.width = tileMap.width;
groundCanvas.height = tileMap.height;
const groundCtx = groundCanvas.getContext( '2d' );
editor.appendChild( groundCanvas );

const activeCanvas = document.createElement( 'canvas' );
activeCanvas.width = tileMap.width;
activeCanvas.height = tileMap.height;
const activeCtx = activeCanvas.getContext( '2d' );
editor.appendChild( activeCanvas );

const pathfindingCanvas = document.createElement( 'canvas' );
editor.appendChild( pathfindingCanvas );

const gridCursor = getGridCursor();
editor.appendChild( gridCursor );

mapResized();

let mouseDown = false;
grid.onmousedown = () => {
  mouseDown = true;
  doMouse();
}
grid.onmouseup   = () => mouseDown = false;

let lastCol = -1, lastRow = -1;
let mouseCol = 0, mouseRow = 0;
grid.onmousemove = ( e: MouseEvent ) => {
  mouseCol = Math.floor( e.offsetX / tileMap.tileSet.tileWidth );
  mouseRow = Math.floor( e.offsetY / tileMap.tileSet.tileHeight );

  insertColButton.style.left = `${ mouseCol * tileMap.tileSet.tileWidth }`;
  insertRowButton.style.top  = `${ mouseRow * tileMap.tileSet.tileHeight }`;

  deleteColButton.style.left = `${ ( mouseCol + 0.5 ) * tileMap.tileSet.tileWidth }`
  deleteRowButton.style.top  = `${ ( mouseRow + 0.5 ) * tileMap.tileSet.tileHeight }`

  gridCursor.style.left = `${ ( mouseCol + 0.5 ) * tileMap.tileSet.tileWidth }`;
  gridCursor.style.top  = `${ ( mouseRow + 0.5 ) * tileMap.tileSet.tileHeight }`;

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
        tileMap.setGround( mouseCol, mouseRow, activeBrush ); 
        break;
      case Layer.Prop:
        tileMap.setProp( mouseCol, mouseRow, activeBrush );
        break;
      case Layer.Actor:
        tileMap.setActor( mouseCol, mouseRow, activeBrush );
        break;
    }

    mapUpdated();
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

function mapResized() {
  updateWidths();
  mapUpdated();
}

function mapUpdated() {
  updatePathfinding();

  tileMap.drawGround( groundCtx );
  drawActiveLayer();

  localStorage.tileMapJson = JSON.stringify( tileMap.toJson() );
}

function updateWidths() {
  groundCanvas.width = tileMap.width;
  groundCanvas.height = tileMap.height;
  activeCanvas.width = tileMap.width;
  activeCanvas.height = tileMap.height;
  pathfindingCanvas.width = tileMap.width;
  pathfindingCanvas.height = tileMap.height;

  topRuler.style.width = `${tileMap.width}`
  leftRuler.style.height = `${ tileMap.height }`
  grid.style.width = `${tileMap.width}`;
  grid.style.height = `${ tileMap.height }`;
}

function updatePathfinding() {
  const pathfindingCtx = pathfindingCanvas.getContext( '2d' );
  pathfindingCtx.clearRect( 0, 0, pathfindingCanvas.width, pathfindingCanvas.height );

  pathfindingCtx.globalAlpha = 0.3;
  PathfindingNode.drawNodes( pathfindingCtx, tileMap.pathfindingNodes );
}

function drawActiveLayer() {
  for ( let row = 0; row < tileMap.rows; row++ ) {
    for ( let col = 0; col < tileMap.cols; col++ ) {
      tileMap.drawPropAt( activeCtx, col, row );
      tileMap.drawActorAt( activeCtx, col, row );
    }
  }
}

function toggleOverlay( label, value ) {
  if ( label == 'Path' ) {
    pathfindingCanvas.style.display = value ? 'inline' : 'none';
  }
  if ( label == 'Grid' ) {
    grid.style.backgroundSize = value ? '32px 32px' : '0px 0px';
  }
}
