import { ImageResource } from '../src/ImageResource.js';

export class TileSet {
  constructor(json) {
    this.ready = new Promise((resolve, reject) => {
      // Load each image only once
      const images = new Map();
      const readys = [];
      json.forEach(tile => {
        if (!images.has(tile.src)) {
          const res = new ImageResource(tile.src);
          images.set(tile.src, res);
          readys.push(res.ready);
        }
      });
  
      // Create tiles from colorized images
      Promise.all(readys).then(() => {
        this.tiles = [];
  
        json.forEach((tile, index) => {
          const colorizedImage = images.get(tile.src).getColorizedImage(tile.color);
          this.tiles.push(new Tile(index, colorizedImage));
        });
  
        resolve();
      });
    });
  }
}

export class TileMap {
  constructor(cols, rows, tileset) {
    this.cols = cols;
    this.rows = rows;
    this.tileset = tileset;

    this.map = Array.from(Array(cols+1), () => Array(rows+1).fill(null));
  }

  setTileAt(col, row, tile) {
    // we have 1 more row/col of terrain points
    if (0 <= col && col <= this.cols && 0 <= row && row <= this.rows) {
      this.map[col][row] = tile;
    }
  }

  fillWithTile(tile) {
    for (var row = 0; row <= this.rows; row ++) {
      for (var col = 0; col <= this.cols; col ++) {
        this.map[col][row] = tile;
      }
    }
  }

  setTilesFromArray(mapArray) {
    for (var row = 0; row <= this.rows; row ++) {
      for (var col = 0; col <= this.cols; col ++) {
        this.map[col][row] = this.tileset.tiles[mapArray[col][row]]; 
      }
    }
  }

  setTileFromContext2D(ctx, tile) {
    const imageData = ctx.getImageData(0, 0, this.cols + 1, this.rows + 1);

    var i = 0;
    for (var row = 0; row <= this.rows; row ++) {
      for (var col = 0; col <= this.cols; col ++) {
        if (imageData.data[i] > 0) {
          this.map[col][row] = tile;
        }
        i += 4;
      }
    }
  }

  

  draw(ctx) {
    const SIZE = 32;
    for (var row = 0; row < this.rows; row ++) {
      for (var col = 0; col < this.cols; col ++) {
        const nwTile = this.map[col][row];
        const neTile = this.map[col + 1][row];
        const swTile = this.map[col][row + 1];
        const seTile = this.map[col + 1][row + 1];

        const layers = new Set([nwTile, neTile, swTile, seTile].sort((a, b) => a.zIndex - b.zIndex));
        layers.forEach(tile => {
          const nw = nwTile == tile ? 1 : 0;
          const ne = neTile == tile ? 1 : 0;
          const sw = swTile == tile ? 1 : 0;
          const se = seTile == tile ? 1 : 0;
  
          ctx.drawImage(tile.images[nw][ne][sw][se], col * SIZE, row * SIZE);
        });
      }
    }
  }
}

export class Tile {
  constructor(zIndex, src) {
    this.zIndex = zIndex;
    this.images = 
    [
      [
        [
          [
            null,                    // NW: 0, NE: 0, SW: 0, SE: 0
            extractImage(src, 0, 2), // NW: 0, NE: 0, SW: 0, SE: 1
          ],
          [
            extractImage(src, 2, 2), // NW: 0, NE: 0, SW: 1, SE: 0
            extractImage(src, 1, 2), // NW: 0, NE: 0, SW: 1, SE: 1
          ],
        ],
        [
          [
            extractImage(src, 0, 4), // NW: 0, NE: 1, SW: 0, SE: 0
            extractImage(src, 0, 3), // NW: 0, NE: 1, SW: 0, SE: 1
          ],
          [
            extractImage(src, 0, 6), // NW: 0, NE: 1, SW: 1, SE: 0
            extractImage(src, 2, 1), // NW: 0, NE: 1, SW: 1, SE: 1
          ] 
        ],
      ],
      [
        [
          [
            extractImage(src, 2, 4), // NW: 1, NE: 0, SW: 0, SE: 0
            extractImage(src, 1, 6), // NW: 1, NE: 0, SW: 0, SE: 1
          ],
          [
            extractImage(src, 2, 3), // NW: 1, NE: 0, SW: 1, SE: 0
            extractImage(src, 1, 1), // NW: 1, NE: 0, SW: 1, SE: 1
          ]
        ],
        [
          [
            extractImage(src, 1, 4), // NW: 1, NE: 1, SW: 0, SE: 0
            extractImage(src, 2, 0), // NW: 1, NE: 1, SW: 0, SE: 1

          ],
          [
            extractImage(src, 1, 0), // NW: 1, NE: 1, SW: 1, SE: 0
            extractImage(src, 1, 3), // NW: 1, NE: 1, SW: 1, SE: 1
          ]
        ]
      ],
    ];
  }
}

function extractImage(src, col, row, width = 32, height = 32) {
  const image = document.createElement('canvas');
  image.width = width;
  image.height = height;
  const ctx = image.getContext('2d');

  ctx.drawImage(src, col * width, row * height, width, height, 0, 0, width, height);
  return image;
}