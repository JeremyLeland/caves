import { TileInfos, TileMap } from '../TileMap.js';

let cols = 20, rows = 20;
let tileIndices = Array( cols * rows ).fill( 0 );

const tileMap = new TileMap( {
  cols: 10, rows: 10,
  tileMap: tileIndices,
  tiles: [ TileInfos.Dirt, TileInfos.Grass, TileInfos.Snow ],
} );

const gridColor = 'rgba(100, 100, 100, .7)';
document.body.style.backgroundImage = `
  linear-gradient(${ gridColor } 1px, transparent 1px),
  linear-gradient(90deg, ${ gridColor } 1px, transparent 1px)
`;
document.body.style.backgroundSize = '32px 32px';

document.body.appendChild( tileMap.canvas );