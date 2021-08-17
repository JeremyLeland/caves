import { GroundInfos, TileMap } from '../TileMap.js';

const tileMap = new TileMap(
  10, 10,
  [ GroundInfos.Dirt, GroundInfos.Grass, GroundInfos.Snow ],
  [
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
);

document.body.appendChild( tileMap.groundCanvas );