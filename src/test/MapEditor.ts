import { PathfindingNode } from '../Pathfinding.js';
import { TileMap } from '../TileMap.js';


enum Layer { Ground, Prop, Actor };

// TODO: Default to blank level if load fails
const defaultJson = { 
  cols: 10, rows: 10, 
  tileSetPath: '../json/outsideTileset.json',
  actorSetPath: '../json/actorInfo.json'
};

const savedJson = localStorage.tileMapJson ? 
  JSON.parse( localStorage.tileMapJson ) : null;

const tileMapJson = savedJson ?? defaultJson;

const tileMap = await TileMap.fromJson( tileMapJson ) ?? await TileMap.fromJson( defaultJson );

let activeBrush = 'Rock';    // TODO: Don't hardcode this, pick one from tileMap.tileSet
let activeLayer = Layer.Ground;

const ui = document.getElementById( 'palette' );

// Make a loop here
const showPath = document.getElementById( 'showPath' ) as HTMLInputElement;
const showGrid = document.getElementById( 'showGrid' ) as HTMLInputElement;
const showGround = document.getElementById( 'showGround' ) as HTMLInputElement;
const showProps = document.getElementById( 'showProps' ) as HTMLInputElement;
const showActors = document.getElementById( 'showActors' ) as HTMLInputElement;

showPath.oninput = mapUpdated;
showGrid.oninput = mapUpdated;
showGround.oninput = mapUpdated;
showProps.oninput = mapUpdated;
showActors.oninput = mapUpdated;

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

// TODO: combine these in a more general loop?
const groundUI = document.getElementById( 'ground' );
for ( let name in tileMap.tileSet.ground ) {
  createButton( name, Layer.Ground, groundUI );
}

const propsUI = document.getElementById( 'props' );
createButton( null, Layer.Prop, propsUI );
for ( let name in tileMap.tileSet.props ) {
  createButton( name, Layer.Prop, propsUI );
}

const actorsUI = document.getElementById( 'actors' );
createButton( null, Layer.Actor, actorsUI );
for ( let name in tileMap.actorSet.actors ) {
  createButton( name, Layer.Actor, actorsUI );
}

function createButton( entity: string, layer: Layer, ui: HTMLElement ) {
  const button = document.createElement( 'button' );
  button.innerText = entity ?? 'None';

  button.onclick = () => {
    activeBrush = entity;
    activeLayer = layer;
  }
  ui.appendChild( button );
  ui.appendChild( document.createElement( 'br' ) );
}

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

const canvas = document.createElement( 'canvas' );
canvas.width = tileMap.width;
canvas.height = tileMap.height;
const ctx = canvas.getContext( '2d' );
editor.appendChild( canvas );

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
  if ( showGround.checked ) {
    tileMap.drawGround( ctx );
  }

  for ( let row = 0; row < tileMap.rows; row++ ) {
    for ( let col = 0; col < tileMap.cols; col++ ) {
      if ( showProps.checked ) {
        tileMap.drawPropAt( ctx, col, row );
      }
      if ( showActors.checked ) { 
        tileMap.drawActorAt( ctx, col, row );
      }
    }
  }

  if ( showPath.checked ) {
    ctx.globalAlpha = 0.3;
    PathfindingNode.drawNodes( ctx, tileMap.pathfindingNodes );
    ctx.globalAlpha = 1.0;
  }

  localStorage.tileMapJson = JSON.stringify( tileMap.toJson() );
}

function updateWidths() {
  canvas.width = tileMap.width;
  canvas.height = tileMap.height;

  topRuler.style.width = `${tileMap.width}`
  leftRuler.style.height = `${ tileMap.height }`
  grid.style.width = `${tileMap.width}`;
  grid.style.height = `${ tileMap.height }`;
}

// TODO: Fix toggling path now that we draw it to single canvas
function toggleOverlay( label, value ) {
  if ( label == 'Path' ) {
    //pathfindingCanvas.style.display = value ? 'inline' : 'none';
  }
  if ( label == 'Grid' ) {
    grid.style.backgroundSize = value ? '32px 32px' : '0px 0px';
  }
}
