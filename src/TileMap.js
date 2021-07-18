import { Images } from '../src/Images.js';
import { Node } from '../src/Pathfinding.js';

const TILE_SIZE = 32;
const PASSABLE_CORNERS = 2;

export const TileInfo = {
  Dirt:  { path: 'dirt',  passable: true  },
  Sand:  { path: 'sand',  passable: true  },
  Path:  { path: 'path',  passable: true  },
  Water: { path: 'water', passable: false },
  Grass: { path: 'grass', passable: true  },
  Snow:  { path: 'snow',  passable: true  },
}

// Set zIndex based on order specified
let zIndex = 0;
for (let tileInfo in TileInfo) {
  TileInfo[tileInfo].zIndex = zIndex++;
}

export class TileMap {
  #groundImage = null;
  #nodesList = [];      // unordered list of all nodes for internal use

  constructor({tiles, indexMap}) {
    this.tiles = tiles;

    // Prepare map with starting values
    // NOTE: we have 1 more row/col of terrain points (each tile is controlled by 4 corners)
    this.cols = indexMap.length - 1;
    this.rows = indexMap[0].length - 1;
    this.map  = Array.from(indexMap, (i) => Array.from(i, (j) => tiles[j]));

    this.nodes = Array.from(Array(this.cols), () => Array(this.rows).fill(null));
    for (let row = 0; row < this.rows; row ++) {
      for (let col = 0; col < this.cols; col ++) {
        if (this.map[col][row].isPassable + this.map[col+1][row].isPassable +
            this.map[col][row+1].isPassable + this.map[col+1][row+1].isPassable >= PASSABLE_CORNERS) {
          const node = new Node(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2);

          if (col > 0)  Node.linkNodes(node, this.nodes[col - 1][row]);
          if (row > 0)  Node.linkNodes(node, this.nodes[col][row - 1]);

          // Allow diagonal paths, as long as it's properly passable
          if (col > 0 && row > 0 && this.map[col][row].isPassable) {
            Node.linkNodes(node, this.nodes[col - 1][row - 1]);
          }
          if (col < this.cols-1 && row > 0 && this.map[col+1][row].isPassable) {
            Node.linkNodes(node, this.nodes[col + 1][row - 1]);
          }

          this.nodes[col][row] = node;
          this.#nodesList.push(this.nodes[col][row]);
        }
      }
    }
  }

  get width()  { return this.cols * TILE_SIZE; }
  get height() { return this.rows * TILE_SIZE; }

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

  getRandomNode() {
    return this.#nodesList[Math.floor(Math.random() * this.#nodesList.length)];
  }

  nodeFor(x, y) {
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);

    if (0 <= col && 0 <= row && col < this.cols && row < this.rows) {
      return this.nodes[col][row];
    }

    return null;
  }

  async applyToCanvas(canvas, {drawGrid = true, drawNodes = true} = {}) {
    canvas.width = this.cols * TILE_SIZE;
    canvas.height = this.rows * TILE_SIZE;
    const ctx = canvas.getContext('2d');

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

          tile.draw(ctx, col, row, nw, ne, sw, se);
        });

        if (drawGrid) {
          ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
          ctx.beginPath();
          ctx.rect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          ctx.stroke();
        }
      }
    }

    if (drawNodes) {
      this.#nodesList.forEach(node => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';

        ctx.beginPath();
        ctx.arc(node.x, node.y, TILE_SIZE / 5, 0, Math.PI * 2);
        ctx.fill();

        node.linkedNodes.forEach(link => {
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(link.x, link.y);
          ctx.stroke();
        });

        ctx.fillStyle = 'black';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText(node.linkedNodes.size, node.x, node.y);
      });
    }

    return canvas;
  }

  draw(ctx) {
    if (this.#groundImage == null) {
      this.#groundImage = document.createElement('canvas');
      this.applyToCanvas(this.#groundImage);
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
  static async loadTiles(tileInfos) {
    const tiles = Array.from(tileInfos, tileInfo => new Tile(tileInfo));
    await Promise.all(tiles.map(t => t.#sheet.decode()));
    return tiles;
  }

  #sheet;

  constructor(tileInfo) {
    this.#sheet = Images.load(`../images/terrain/${tileInfo.path}.png`);
    this.zIndex = tileInfo.zIndex;
    this.isPassable = tileInfo.isPassable;
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