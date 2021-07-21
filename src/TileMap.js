import { Images } from '../src/Images.js';
import { Node } from '../src/Pathfinding.js';

const TILE_SIZE = 32;

export const TileInfo = {
  Dirt:  { isPassable: true,  sheetIndex: 0, filter: 'hue-rotate(35deg)' },
  Sand:  { isPassable: true,  sheetIndex: 1, filter: 'hue-rotate(35deg)' },
  Rock:  { isPassable: true,  sheetIndex: 0, filter: 'saturate(0) brightness(0.6)' },
  Path:  { isPassable: true,  sheetIndex: 2, filter: 'hue-rotate(35deg) saturate(0.5)' },
  Water: { isPassable: false, sheetIndex: 3 },
  Empty: { isPassable: false, sheetIndex: 4, filter: 'saturate(0)' },
  Grass: { isPassable: true,  sheetIndex: 5, filter: 'hue-rotate(100deg) brightness(1.3)' },
  Snow:  { isPassable: true,  sheetIndex: 1, filter: 'saturate(0)' },
};

// Set zIndex based on order specified
let zIndex = 0;
for (let tileInfo in TileInfo) {
  TileInfo[tileInfo].zIndex = zIndex++;
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

// TODO: Make this more like TileInfo -- define whether passable and which parts of sheet to use
// TODO: Define "terrain" as collection of base tile and possible flora? Then first array would define
//       terrain type, and second array would define flora intensity. Appropriate flora would be chosen
//       based on terrain type (e.g. reeds and lily pads for water) and intensity (e.g. flowers for low, 
//       bushes for medium, trees for high?)
// TODO: Alternatively, we could pick "height" of flora based on distance from water (which would be 
//       terrain height, really -- flowers closer to water, trees further from) and base the probability
//       of placement on the flora intensity map? So many possibilities...

export const FloraInfo = {
  None: 0,
  Flowers: 1,
  Bushes: 2
};

const VARIANT_CHANCE = 0.15;
const TILES_SHEET = Images.load('../images/tiles.png');
const PLANTS_SHEET = Images.load('../images/plants.png');

await Promise.all([TILES_SHEET, PLANTS_SHEET].map(e => e.decode()));

export class TileMap {
  #groundImage = null;
  #nodesList = [];      // unordered list of all nodes for internal use

  // TODO: change "indexMap" to "tileMap" now that we also have floraMap?
  constructor({tiles, indexMap, floraMap}) {
    this.tiles = tiles;

    // Prepare map with starting values
    // NOTE: we have 1 more row/col of terrain points (each tile is controlled by 4 corners)
    this.cols = indexMap.length;
    this.rows = indexMap[0].length;
    this.map  = Array.from(indexMap, (i) => Array.from(i, (j) => tiles[j]));

    this.floraMap = floraMap;

    this.nodes = Array.from(Array(this.cols), () => Array(this.rows).fill(null));
    for (let row = 0; row < this.rows; row ++) {
      for (let col = 0; col < this.cols; col ++) {
        if (this.map[col][row].isPassable) {
          const node = new Node(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2);

          if (col > 0)  Node.linkNodes(node, this.nodes[col - 1][row]);
          if (row > 0)  Node.linkNodes(node, this.nodes[col][row - 1]);

          // Allow diagonal paths, as long as it's properly passable
          if (col > 0 && row > 0 && this.map[col - 1][row].isPassable && this.map[col][row - 1].isPassable) {
            Node.linkNodes(node, this.nodes[col - 1][row - 1]);
          }
          if (col < this.cols-1 && row > 0 && this.map[col + 1][row].isPassable && this.map[col][row - 1].isPassable) {
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
    if (0 <= col && col < this.cols && 0 <= row && row < this.rows) {
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

  createCanvas({drawGrid = false, drawNodes = false} = {}) {
    const timeStr = `Creating canvas from TileMap`;
    console.time(timeStr);

    const canvas = docment.createElement('canvas');
    canvas.width = this.cols * TILE_SIZE;
    canvas.height = this.rows * TILE_SIZE;
    const ctx = canvas.getContext('2d');

    for (var row = -1; row < this.rows; row ++) {
      for (var col = -1; col < this.cols; col ++) {
        const wCol = Math.max(0, col), eCol = Math.min(col + 1, this.cols - 1);
        const nRow = Math.max(0, row), sRow = Math.min(row + 1, this.rows - 1);

        const nwTile = this.map[wCol][nRow];
        const neTile = this.map[eCol][nRow];
        const swTile = this.map[wCol][sRow];
        const seTile = this.map[eCol][sRow];

        drawTile(ctx, col, row, nwTile, neTile, swTile, seTile);
      }
    }

    if (this.floraMap != null) {
      for (var row = 0; row < this.rows; row ++) {
        for (var col = 0; col < this.cols; col ++) {
          drawFlora(ctx, col, row, this.floraMap[col][row]);
        }
      }
    }

    if (drawGrid) {
      ctx.beginPath();
      for (var row = 0; row < this.rows; row ++) {
        for (var col = 0; col < this.cols; col ++) {
          ctx.rect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.stroke();
    }

    if (drawNodes) {
      this.#nodesList.forEach(node => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';

        ctx.beginPath();
        ctx.arc(node.x, node.y, TILE_SIZE / 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        node.linkedNodes.forEach(link => {
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(link.x, link.y);
        });
        ctx.stroke();

        ctx.fillStyle = 'black';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText(node.linkedNodes.size, node.x, node.y);
      });
    }

    console.timeEnd(timeStr);
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

const TERRAIN_SHEET_WIDTH = TILE_SIZE * 3;
const TERRAIN_SHEET_HEIGHT = TILE_SIZE * 7;
export function createTileSheet(tileInfos) {
  const canvas = document.createElement('canvas');
  canvas.width = tileInfos.length * TERRAIN_SHEET_WIDTH;
  canvas.height = TERRAIN_SHEET_HEIGHT;
  const ctx = canvas.getContext('2d');

  let destX = 0;
  tileInfos.forEach(tileInfo => {
    const sheetX = tileInfo.sheetIndex * TERRAIN_SHEET_WIDTH;

    ctx.filter = tileInfo.filter ?? 'none';
    
    ctx.drawImage(TILES_SHEET, 
      sheetX, 0, TERRAIN_SHEET_WIDTH, TERRAIN_SHEET_HEIGHT,
      destX, 0, TERRAIN_SHEET_WIDTH, TERRAIN_SHEET_HEIGHT);

    destX += TERRAIN_SHEET_WIDTH;
  });

  return canvas;
}

function drawTile(ctx, col, row, nwTile, neTile, swTile, seTile) {
  const layers = new Set([nwTile, neTile, swTile, seTile].sort((a, b) => a.zIndex - b.zIndex));

  let firstLayer = true;

  layers.forEach(tile => {
    const nw = (nwTile == tile || firstLayer) ? 1 : 0;
    const ne = (neTile == tile || firstLayer) ? 1 : 0;
    const sw = (swTile == tile || firstLayer) ? 1 : 0;
    const se = (seTile == tile || firstLayer) ? 1 : 0;

    firstLayer = false;

    let coords = TILE_COORDS[nw][ne][sw][se];

    if (Array.isArray(coords[0])) {
      const index = Math.random() < VARIANT_CHANCE ? Math.floor(Math.random() * coords.length) : 0;
      coords = coords[index];
    }

    const sheetX = (coords[0] + tile.sheetIndex * 3) * TILE_SIZE;
    const sheetY = coords[1] * TILE_SIZE;
    const destX = col * TILE_SIZE + TILE_SIZE / 2;
    const destY = row * TILE_SIZE + TILE_SIZE / 2;

    ctx.drawImage(TILES_SHEET, sheetX, sheetY, TILE_SIZE, TILE_SIZE, destX, destY, TILE_SIZE, TILE_SIZE);
  });
}

function drawFlora(ctx, col, row, flora) {
  if (flora == FloraInfo.Flowers) {
    const sheetX = (10 + Math.floor(Math.random() * 5)) * TILE_SIZE;
    const sheetY = ( 0 + Math.floor(Math.random() * 4)) * TILE_SIZE;
    const destX = col * TILE_SIZE;
    const destY = row * TILE_SIZE;

    ctx.drawImage(PLANTS_SHEET, sheetX, sheetY, TILE_SIZE, TILE_SIZE, destX, destY, TILE_SIZE, TILE_SIZE);
  }

  if (flora == FloraInfo.Bushes) {
    const sheetX = ( 6 + Math.floor(Math.random() * 3) * 2) * TILE_SIZE;
    const sheetY = (22 + Math.floor(Math.random() * 2) * 2) * TILE_SIZE;
    const destX = col * TILE_SIZE - TILE_SIZE / 2;
    const destY = row * TILE_SIZE - TILE_SIZE / 2;

    ctx.drawImage(PLANTS_SHEET, sheetX, sheetY, TILE_SIZE*2, TILE_SIZE*2, destX, destY, TILE_SIZE*2, TILE_SIZE*2);
  }
}
