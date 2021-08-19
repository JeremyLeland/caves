import { GroundInfos, TileMap } from '../TileMap.js';

const tileMap = await TileMap.fromJson({
  cols: 10, rows: 10,
  tileInfos: [ GroundInfos.Dirt, GroundInfos.Grass, GroundInfos.Snow ],
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