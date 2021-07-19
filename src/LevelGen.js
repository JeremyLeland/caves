import { TileInfo, TileMap } from '../src/TileMap.js';
import * as Perlin from '../src/perlin.js';

export class LevelGen {
  static generateCaveArray(cols, rows) {
    const timeStr = `Generating ${cols}x${rows} cave array`;
    console.time(timeStr);

    // Generate base walls with cellular automata
    const walls = this.gameOfLife(cols, rows);

    const cells = Array.from(Array(cols), () => new Array(rows));

    const WALL = 2, DIRT = 0, PATH = 1;

    for (let row = 0; row < rows; row ++) {
      for (let col = 0; col < cols; col ++) {
        if (walls[col][row]) {
          cells[col][row] = WALL;
        }
        else {
          let nearby = this.#wallsNearby(walls, col, row, 2);
          cells[col][row] = nearby < 2 ? PATH : DIRT;   // Add path to areas far from walls
        }
      }
    }

    console.timeEnd(timeStr);
    return cells;
  }

  static #wallsNearby(cells, col, row, radius = 1) {
    const cols = cells.length, rows = cells[0].length;

    let nearby = 0;

    for (let r = row - radius; r <= row + radius; r ++) {
      for (let c = col - radius; c <= col + radius; c ++) {
        if (r < 0 || r >= rows || c < 0 || c >= cols) {
          nearby ++;  // count out-of-bounds as walls
        }
        else if (r == row && c == col) {
          // skip ourselves
        }
        else if (cells[c][r]) {
          nearby ++;
        }
      }
    }

    return nearby;
  }

  // See https://gamedevelopment.tutsplus.com/tutorials/generate-random-cave-levels-using-cellular-automata--gamedev-9664
  static gameOfLife(cols, rows, {lifeChance = 0.4, birthLimit = 4, deathLimit = 2, steps = 8} = {}) {
    let cells = Array.from(
      Array(cols), () => Array.from(
        Array(rows), () => Math.random() < lifeChance));

    for (let i = 0; i < steps; i ++) {
      const newCells = Array.from(Array(cols), () => new Array(rows));
      
      for (let row = 0; row < rows; row ++) {
        for (let col = 0; col < cols; col ++) {
          let nearby = this.#wallsNearby(cells, col, row);
          newCells[col][row] = nearby > (cells[col][row] ? deathLimit : birthLimit);
        }
      }
  
      cells = newCells;
    }

    return cells;
  }

  static generateLandscape(cols, rows) {
    const heights = this.generateHeights(cols, rows, {frequency: 0.04, ridged: true});

    const terrainVals = [
      0.05,   // water
      0.14,   // beach
      0.5,   // grass
      0.6,   // mount
      1.00    // snow!
    ];

    const terrainMap = Array.from(heights, col => Array.from(col, val => {
      for (let i = 0; i < terrainVals.length; i ++) {
        if (val < terrainVals[i]) {
          return i;
        }
      }
    }));

    const floraMap = Array.from(heights, col => Array.from(col, val => {
      return Math.random() < val ? 1 : 0;
    }));

    return new TileMap({
      tiles: [TileInfo.Water, TileInfo.Sand, TileInfo.Grass, TileInfo.Dirt, TileInfo.Snow],
      indexMap: terrainMap,
      floraMap: floraMap,
    });
  }

  static generateHeights(cols, rows, {ridged = false, seed = Date.now(), octaves = 5, frequency = 0.02, persistance = 0.5} = {}) {
    const timeStr = `Generating ${cols}x${rows} height map with seed ${seed}`;
    console.time(timeStr);
    
    const heights = Array.from(Array(cols), () => Array.from(Array(rows).fill(0)));

    for (var row = 0; row < rows; row ++) {
      for (var col = 0; col < cols; col ++) {
        let total = 0;
        let freq = frequency;
        let amplitude = 1;
        let maxValue = 0;

        for (let i = 1; i <= octaves; i++) {
          total += Perlin.noise2(seed + col * freq, seed + row * freq) * amplitude;

          maxValue += amplitude;
          amplitude *= persistance;
          freq *= 2;
        }

        heights[col][row] = total / maxValue;

        if (ridged) {
          heights[col][row] = Math.abs(0.5 - heights[col][row]) * 2;
        }
      }
    }

    console.timeEnd(timeStr);
    return heights;
  }
}