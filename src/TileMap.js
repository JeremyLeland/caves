export class TileMap {
  #groundImage = null;

  constructor({cols, rows, tileImages, indexMap = null, defaultIndex = 0}) {
    this.cols = cols;
    this.rows = rows;
    this.tiles = Array.from(tileImages, (image, index) => new Tile(image, index));
    
    // Prepare map with starting values
    // NOTE: we have 1 more row/col of terrain points (each tile is controlled by 4 corners)
    this.map = Array.from(Array(cols+1), () => Array(rows+1).fill(null));        
    for (let row = 0; row <= this.rows; row ++) {
      for (let col = 0; col <= this.cols; col ++) {
        this.map[col][row] = this.tiles[indexMap != null ? indexMap[col][row] : defaultIndex]; 
      }
    }
  }

  setTileAt(col, row, tile) {
    if (0 <= col && col <= this.cols && 0 <= row && row <= this.rows) {
      this.map[col][row] = tile;
    }
  }

  setTileFromContext2D(ctx, tile) {
    const pixelBuffer = new Uint32Array(
      ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height).data.buffer
    );

    var i = 0;
    for (var row = 0; row <= this.rows; row ++) {
      for (var col = 0; col <= this.cols; col ++) {
        if (pixelBuffer[i++] > 0) {
          this.map[col][row] = tile;
        }
      }
    }
  }

  draw(ctx) {
    if (this.#groundImage == null) {
      const SIZE = this.tiles[0].width;

      this.#groundImage = document.createElement('canvas');
      this.#groundImage.width = this.cols * SIZE;
      this.#groundImage.height = this.rows * SIZE;
      const groundCtx = this.#groundImage.getContext('2d');
      
      for (var row = 0; row < this.rows; row ++) {
        for (var col = 0; col < this.cols; col ++) {
          const nwTile = this.map[col][row];
          const neTile = this.map[col + 1][row];
          const swTile = this.map[col][row + 1];
          const seTile = this.map[col + 1][row + 1];
  
          const layers = new Set([nwTile, neTile, swTile, seTile].sort((a, b) => a.zIndex - b.zIndex));
          
          var firstLayer = true;

          layers.forEach(tile => {
            const nw = (nwTile == tile || firstLayer) ? 1 : 0;
            const ne = (neTile == tile || firstLayer) ? 1 : 0;
            const sw = (swTile == tile || firstLayer) ? 1 : 0;
            const se = (seTile == tile || firstLayer) ? 1 : 0;

            firstLayer = false;

            var image = tile.images[nw][ne][sw][se];

            if (Array.isArray(image)) {
              const index = Math.random() < 0.15 ? Math.floor(Math.random() * image.length) : 0
              groundCtx.drawImage(image[index], col * SIZE, row * SIZE);
            }
            else {
              groundCtx.drawImage(image, col * SIZE, row * SIZE);
            }
          });
        }
      }
    }
    
    ctx.drawImage(this.#groundImage, 0, 0);
  }
}

const layout = 
[
  // NW, NE, SW, SE
  [[0, 0, 0, 0], [ 1, 1, 1, 0], [ 1, 1, 0, 1]],
  [[0, 0, 0, 0], [ 1, 0, 1, 1], [ 0, 1, 1, 1]],
  [[0, 0, 0, 1], [ 0, 0, 1, 1], [ 0, 0, 1, 0]],
  [[0, 1, 0, 1], [ 1, 1, 1, 1], [ 1, 0, 1, 0]],
  [[0, 1, 0, 0], [ 1, 1, 0, 0], [ 1, 0, 0, 0]],
  [[1, 1, 1, 1], [ 1, 1, 1, 1], [ 1, 1, 1, 1]],
  [[0, 1, 1, 0], [ 1, 0, 0, 1], [ 0, 0, 0, 0]],
];

export class Tile {
  constructor(src, zIndex) {
    this.width = 32;    // TODO: Don't hardcode this, specify it somewhere else?
    this.height = 32;
    this.zIndex = zIndex;

    this.images = Array(2).fill().map(() => 
                    Array(2).fill().map(() => 
                      Array(2).fill().map(() => 
                        Array(2).fill())));

    this.images[1][1][1][1] = [];   // Special case for "full tile" variants

    const w = this.width, h = this.height;
    for (let row = 0; row < layout.length; row ++) {
      for (let col = 0; col < layout[row].length; col ++) {
        const image = document.createElement('canvas');
        [image.width, image.height] = [w, h];
        const ctx = image.getContext('2d');
        
        ctx.drawImage(src, col * w, row * h, w, h, 0, 0, w, h);
        
        const [nw, ne, sw, se] = layout[row][col];
        if (nw & ne & sw & se == 1) {
          this.images[1][1][1][1].push(image);    // Special case for "full tile" variants
        }
        else {
          this.images[nw][ne][sw][se] = image;
        }
      }
    }
  }
}