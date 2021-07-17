import * as Perlin from '../src/perlin.js';

export class LevelGen {
  static generateCaveArray(cols, rows) {
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

  static generateHeights({cols, rows, seed = Date.now(), ridged = false}) {
    const timeStr = `Generating ${cols}x${rows} height map with seed ${seed}`;
    console.time(timeStr);
    
    const heights = Array.from(Array(cols), () => Array.from(Array(rows).fill(0)));

    for (var row = 0; row < rows; row ++) {
      for (var col = 0; col < cols; col ++) {
        var amplitude = 0.5;

        for (let i = 1; i <= 5; i++) {
          heights[col][row] += amplitude * Perlin.noise2(seed + col * Math.pow(2,i) / 200, seed + row * Math.pow(2,i) / 200);
          amplitude *= 0.5;
        }

        if (ridged) {
          heights[col][row] = Math.abs(0.5 - heights[col][row]) * 4;
        }
      }
    }

    console.timeEnd(timeStr);
    return heights;
  }
}

  