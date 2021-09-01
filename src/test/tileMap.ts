import { TileMap } from '../TileMap.js';

const tileMap = await TileMap.fromJson({
  cols: 10, rows: 10,
  tileSetPath: '../json/outsideTileset.json',
  actorSetPath: '../json/actorInfo.json',
  tileInfoKeys: [ 'Dirt', 'Grass', 'Snow' ],
  groundMap: [
    0, 0, 0, 0, 0, 1, 1, 1, 1, 1,
    0, 1, 1, 1, 0, 1, 0, 0, 0, 1,
    0, 1, 0, 1, 0, 1, 2, 2, 0, 1,
    0, 1, 1, 1, 0, 1, 0, 0, 0, 1,
    0, 0, 0, 0, 0, 1, 1, 1, 1, 1,
    0, 1, 0, 1, 0, 0, 0, 0, 0, 0,
    0, 0, 1, 0, 0, 0, 1, 0, 0, 0,
    0, 1, 0, 1, 0, 1, 1, 1, 0, 0,
    0, 0, 0, 0, 0, 0, 1, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ]
});

const groundCanvas = document.createElement( 'canvas' );
groundCanvas.width = tileMap.width;
groundCanvas.height = tileMap.height;
const groundCtx = groundCanvas.getContext( '2d' );

document.body.appendChild( groundCanvas );
tileMap.drawGround( groundCtx );