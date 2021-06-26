import { ImageResource } from '../src/ImageResource.js';

export class TileMap {
  constructor(json) {
    this.cols = json.cols;
    this.rows = json.rows;

    // Note 1: map will be drawn at cols-1, rows-1 size
    // Note 2: map is stored in [row][col], but needs to be drawn at col, row. Sorry.
    this.map = json.map;

    this.ready = new Promise((resolve, reject) => {
      // Load each image only once
      const images = new Map();
      const readys = [];
      json.tiles.forEach(tile => {
        if (!images.has(tile.src)) {
          const res = new ImageResource(tile.src);
          images.set(tile.src, res);
          readys.push(res.ready);
        }
      });

      // Create tiles from colorized images
      Promise.all(readys).then(() => {
        this.tiles = [];

        json.tiles.forEach(tile => {
          const colorizedImage = images.get(tile.src).getColorizedImage(tile.color);
          this.tiles.push(new Tile(colorizedImage));
        });

        resolve();
      });
    });
  }

  setTileAt(col, row, tile) {
    // we have 1 more row/col of terrain points
    if (0 <= col && col <= this.cols && 0 <= row && row <= this.rows) {
      this.map[row][col] = tile;
    }
  }

  addTileRectangle(col, row, width, height, tile) {
    for (var r = row; r < row + height; r ++) {
      for (var c = col; c < col + width; c ++) {
        this.setTileAt(c, r, tile);
      }
    }
  }

  // See http://members.chello.at/easyfilter/bresenham.js
  addTileLine(startCol, startRow, endCol, endRow, tile) {
    var x0 = startCol, y0 = startRow, x1 = endCol, y1 = endRow;
    var dx =  Math.abs(x1-x0), sx = x0<x1 ? 1 : -1;
    var dy = -Math.abs(y1-y0), sy = y0<y1 ? 1 : -1;
    var err = dx+dy, e2;                                   /* error value e_xy */
 
    for (;;){                                                          /* loop */
      this.setTileAt(x0, y0, tile);
      if (x0 == x1 && y0 == y1) break;
      e2 = 2*err;
      if (e2 >= dy) { err += dy; x0 += sx; }                         /* x step */
      if (e2 <= dx) { err += dx; y0 += sy; }                         /* y step */
    }
  }

  addTileEllipse(middleCol, middleRow, width, height, tile) {
    var xm = middleCol, ym = middleRow, a = width, b = height;
    var x = -a, y = 0;           /* II. quadrant from bottom left to top right */
    var e2, dx = (1+2*x)*b*b;                              /* error increment  */
    var dy = x*x, err = dx+dy;                              /* error of 1.step */

    do {
      this.setTileAt(xm-x, ym+y, tile);                       /*   I. Quadrant */
      this.setTileAt(xm+x, ym+y, tile);                       /*  II. Quadrant */
      this.setTileAt(xm+x, ym-y, tile);                       /* III. Quadrant */
      this.setTileAt(xm-x, ym-y, tile);                       /*  IV. Quadrant */
      e2 = 2*err;                                        
      if (e2 >= dx) { x++; err += dx += 2*b*b; }                     /* x step */
      if (e2 <= dy) { y++; err += dy += 2*a*a; }                     /* y step */
    } while (x <= 0);

    while (y++ < b) {            /* too early stop for flat ellipses with a=1, */
      this.setTileAt(xm, ym+y, tile);              /* -> finish tip of ellipse */
      this.setTileAt(xm, ym-y, tile);
    }
  }

  draw(ctx) {
    const SIZE = 32;
    for (var row = 0; row < this.rows; row ++) {
      for (var col = 0; col < this.cols; col ++) {
        const nwTile = this.map[row][col];
        const neTile = this.map[row][col + 1];
        const swTile = this.map[row + 1][col];
        const seTile = this.map[row + 1][col + 1];

        const layers = new Set([nwTile, neTile, swTile, seTile].sort());
        layers.forEach(tileIndex => {
          if (tileIndex >= this.tiles.length) {
            console.log(`WARNING: tile index ${tileIndex}, but only ${this.tiles.length} tiles -- skipping`);
          }
          else {
            const nw = nwTile == tileIndex ? 1 : 0;
            const ne = neTile == tileIndex ? 1 : 0;
            const sw = swTile == tileIndex ? 1 : 0;
            const se = seTile == tileIndex ? 1 : 0;
  
            ctx.drawImage(this.tiles[tileIndex].images[nw][ne][sw][se], col * SIZE, row * SIZE);
          }
        });
      }
    }
  }
}

export class Tile {
  constructor(src) {
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