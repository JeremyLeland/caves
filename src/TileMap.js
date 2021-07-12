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

  spawn(actor) {
    const MAX_ATTEMPTS = 10;
    for (let i = 0; i < MAX_ATTEMPTS; i ++) {
      const col = Math.floor(Math.random() * this.cols);
      const row = Math.floor(Math.random() * this.rows);
      const node = this.nodes[col][row];

      if (node != null) {
        actor.spawn(node.x, node.y);
        return;
      }
    }

    console.log(`WARNING: unable to place actor after ${MAX_ATTEMPTS} attempts!`);
  }

  nodeFor(x, y) {
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);

    if (0 <= col && 0 <= row && col < this.cols && row < this.rows) {
      return this.nodes[col][row];
    }
    
    return null;
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

            tile.draw(groundCtx, col, row, nw, ne, sw, se);
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

const TILE_COORDS = 
[
  [
    [
      [
        null,   // NW: 0, NE: 0, SW: 0, SE: 0
        [0, 2], // NW: 0, NE: 0, SW: 0, SE: 1
      ],
      [
        [2, 2], // NW: 0, NE: 0, SW: 1, SE: 0
        [1, 2], // NW: 0, NE: 0, SW: 1, SE: 1
      ],
    ],
    [
      [
        [0, 4], // NW: 0, NE: 1, SW: 0, SE: 0
        [0, 3], // NW: 0, NE: 1, SW: 0, SE: 1
      ],
      [
        [0, 6], // NW: 0, NE: 1, SW: 1, SE: 0
        [2, 1], // NW: 0, NE: 1, SW: 1, SE: 1
      ] 
    ],
  ],
  [
    [
      [
        [2, 4], // NW: 1, NE: 0, SW: 0, SE: 0
        [1, 6], // NW: 1, NE: 0, SW: 0, SE: 1
      ],
      [
        [2, 3], // NW: 1, NE: 0, SW: 1, SE: 0
        [1, 1], // NW: 1, NE: 0, SW: 1, SE: 1
      ]
    ],
    [
      [
        [1, 4], // NW: 1, NE: 1, SW: 0, SE: 0
        [2, 0], // NW: 1, NE: 1, SW: 0, SE: 1
      ],
      [
        [1, 0], // NW: 1, NE: 1, SW: 1, SE: 0
        // NW: 1, NE: 1, SW: 1, SE: 1
        [
          [1, 3], [0, 5], [1, 5], [2, 5]
        ]
      ]
    ]
  ],
];

export class Tile {
  static async loadTiles(paths) {
    const tiles = [];
    let zIndex = 0;
    for (let path in paths) {
      tiles.push(new Tile({
        src: Images.load(`../images/terrain/${path}.png`), zIndex: zIndex++, isPassable: paths[path]
      }));
    }
    await Promise.all(tiles.map(t => t.#sheet.decode()));

    return tiles;
  }

  #sheet;

  constructor({src, zIndex, isPassable}) {
    this.#sheet = src;
    this.zIndex = zIndex;
    this.isPassable = isPassable;
  }

  draw(ctx, col, row, nw, ne, sw, se) {
    let coords = TILE_COORDS[nw][ne][sw][se];

    // Account for variants
    if (Array.isArray(coords[0])) {
      const index = Math.random() < 0.15 ? Math.floor(Math.random() * coords.length) : 0;
      coords = coords[index];
    }

    const [sheetX, sheetY] = coords.map(e => e * TILE_SIZE);
    ctx.drawImage(this.#sheet, sheetX, sheetY, TILE_SIZE, TILE_SIZE, 
      col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }
}