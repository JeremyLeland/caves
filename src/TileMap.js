import { Images } from '../src/Images.js';
import { Node } from '../src/Pathfinding.js';

const TILE_SIZE = 32;
const DEBUG_DRAW_GRID = false;
const DEBUG_DRAW_NODES = true;

export class TileMap {
  #groundImage = null;

  constructor({cols, rows, tiles, indexMap = null, defaultIndex = 0}) {
    this.cols = cols;
    this.rows = rows;
    this.tiles = tiles;
    
    // Prepare map with starting values
    // NOTE: we have 1 more row/col of terrain points (each tile is controlled by 4 corners)
    this.map = Array.from(Array(cols+1), () => Array(rows+1).fill(null));
    for (let row = 0; row <= this.rows; row ++) {
      for (let col = 0; col <= this.cols; col ++) {
        this.map[col][row] = this.tiles[indexMap != null ? indexMap[col][row] : defaultIndex]; 
      }
    }

    this.nodes = Array.from(Array(cols), () => Array(rows).fill(null));
    for (let row = 0; row < this.rows; row ++) {
      for (let col = 0; col < this.cols; col ++) {
        // Tile is passable if more than half of its corners are passable
        if (this.map[col][row].isPassable + this.map[col+1][row].isPassable +
            this.map[col][row+1].isPassable + this.map[col+1][row+1].isPassable > 2) {
          this.nodes[col][row] = new Node(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2);
          if (col > 0)  Node.linkNodes(this.nodes[col][row], this.nodes[col - 1][row]);
          if (row > 0)  Node.linkNodes(this.nodes[col][row], this.nodes[col][row - 1]);
          if (col > 0 && row > 0) Node.linkNodes(this.nodes[col][row], this.nodes[col - 1][row - 1]);
          if (col < this.cols-1 && row > 0) Node.linkNodes(this.nodes[col][row], this.nodes[col + 1][row - 1]);
        }
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
      this.#groundImage = document.createElement('canvas');
      this.#groundImage.width = this.cols * TILE_SIZE;
      this.#groundImage.height = this.rows * TILE_SIZE;
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
              groundCtx.drawImage(image[index], col * TILE_SIZE, row * TILE_SIZE);
            }
            else {
              groundCtx.drawImage(image, col * TILE_SIZE, row * TILE_SIZE);
            }
          });

          if (DEBUG_DRAW_GRID) {
            groundCtx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
            groundCtx.beginPath();
            groundCtx.rect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            groundCtx.stroke();
          }

          if (DEBUG_DRAW_NODES) {
            groundCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            groundCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';

            const node = this.nodes[col][row];

            if (node != null) {
              groundCtx.beginPath();
              groundCtx.arc(node.x, node.y, TILE_SIZE / 5, 0, Math.PI * 2);
              groundCtx.fill();

              node.linkedNodes.forEach(link => {
                groundCtx.beginPath();
                groundCtx.moveTo(node.x, node.y);
                groundCtx.lineTo(link.x, link.y);
                groundCtx.stroke();
              });
            }
          }
        }
      }
    }
    
    ctx.drawImage(this.#groundImage, 0, 0);
  }
}

const TILE_LAYOUT = 
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
  static async loadTiles(paths) {
    const tiles = [];
    let zIndex = 0;
    for (let path in paths) {
      tiles.push(new Tile({
        width: TILE_SIZE, height: TILE_SIZE, 
        src: `../images/terrain/${path}.png`, zIndex: zIndex++, isPassable: paths[path]
      }));
    }
    await Promise.all(tiles.map(t => t.ready));

    return tiles;
  }

  constructor({width, height, src, zIndex, isPassable}) {
    this.width = width;
    this.height = height;
    this.zIndex = zIndex;
    this.isPassable = isPassable;

    this.ready = new Promise((resolve, reject) => {
      const sheet = Images.load(src);
      sheet.decode().then(() => {
        this.images = Array(2).fill().map(() => 
                        Array(2).fill().map(() => 
                          Array(2).fill().map(() => 
                            Array(2).fill())));

        this.images[1][1][1][1] = [];   // Special case for "full tile" variants

        const w = this.width, h = this.height;
        for (let row = 0; row < TILE_LAYOUT.length; row ++) {
          for (let col = 0; col < TILE_LAYOUT[row].length; col ++) {
            const image = document.createElement('canvas');
            [image.width, image.height] = [w, h];
            const ctx = image.getContext('2d');
            
            ctx.drawImage(sheet, col * w, row * h, w, h, 0, 0, w, h);
            
            const [nw, ne, sw, se] = TILE_LAYOUT[row][col];
            if (nw & ne & sw & se == 1) {
              this.images[1][1][1][1].push(image);    // Special case for "full tile" variants
            }
            else {
              this.images[nw][ne][sw][se] = image;
            }
          }
        }

        resolve();
      });
    });
  }
}