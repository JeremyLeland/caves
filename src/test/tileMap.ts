import { TileMap } from '../TileMap.js';

const tileMap = await TileMap.fromJson({
  cols: 10, rows: 10,
  tileSetPath: '../json/outsideTileset.json',
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

document.body.appendChild( tileMap.groundCanvas );
tileMap.fullRedraw();