//import { Images } from './Images';
//import { Node } from './Pathfinding';

const TILE_SIZE = 32;

interface TileInfo {
  src: string;
  row?: number;
  col?: number;
  isPassable: boolean;
}

export const TileInfos: Record< string, TileInfo > = {
  Dirt:  { src: 'terrain/dirt.png', isPassable: true },
  Sand:  { src: 'terrain/sand.png', isPassable: true },
  Rock:  { src: 'terrain/rock_light.png', isPassable: true },
  Path:  { src: 'terrain/path.png', isPassable: true },
  Water: { src: 'terrain/water.png', isPassable: false },
  Hole:  { src: 'terrain/hole.png', isPassable: false },
  Empty: { src: 'terrain/empty.png', isPassable: false },
  Grass: { src: 'terrain/grass.png', isPassable: true },
  Snow:  { src: 'terrain/snow.png', isPassable: true },
};

const TILE_IMAGES = new Map< string, HTMLImageElement >();
const imagePromises = new Array< Promise< void > >();

for ( let tileInfo in TileInfos ) {
  const path = TileInfos[ tileInfo ].src;

  if ( !TILE_IMAGES.has( path ) ) {
    const image = new Image();
    image.src = `../images/${path}`;
    imagePromises.push( image.decode() );

    TILE_IMAGES.set( path, image );
  }
}

Promise.all( imagePromises );

const TILE_COORDS = [
  [],           // NW: 0, NE: 0, SW: 0, SE: 0
  [ [ 0, 2] ],  // NW: 0, NE: 0, SW: 0, SE: 1
  [ [ 2, 2] ],  // NW: 0, NE: 0, SW: 1, SE: 0
  [ [ 1, 2] ],  // NW: 0, NE: 0, SW: 1, SE: 1
  [ [ 0, 4] ],  // NW: 0, NE: 1, SW: 0, SE: 0
  [ [ 0, 3] ],  // NW: 0, NE: 1, SW: 0, SE: 1
  [ [ 0, 6] ],  // NW: 0, NE: 1, SW: 1, SE: 0
  [ [ 2, 1] ],  // NW: 0, NE: 1, SW: 1, SE: 1
  [ [ 2, 4] ],  // NW: 1, NE: 0, SW: 0, SE: 0
  [ [ 1, 6] ],  // NW: 1, NE: 0, SW: 0, SE: 1
  [ [ 2, 3] ],  // NW: 1, NE: 0, SW: 1, SE: 0
  [ [ 1, 1] ],  // NW: 1, NE: 0, SW: 1, SE: 1
  [ [ 1, 4] ],  // NW: 1, NE: 1, SW: 0, SE: 0
  [ [ 2, 0] ],  // NW: 1, NE: 1, SW: 0, SE: 1
  [ [ 1, 0] ],  // NW: 1, NE: 1, SW: 1, SE: 0
  [             // NW: 1, NE: 1, SW: 1, SE: 1
    [1, 3], [0, 5], [1, 5], [2, 5]
  ]
];

// TODO: Make this more like TileInfo -- define whether passable and which parts of sheet to use
// TODO: Define "terrain" as collection of base tile and possible flora? Then first array would define
//       terrain type, and second array would define flora intensity. Appropriate flora would be chosen
//       based on terrain type (e.g. reeds and lily pads for water) and intensity (e.g. flowers for low, 
//       bushes for medium, trees for high?)
// TODO: Alternatively, we could pick "height" of flora based on distance from water (which would be 
//       terrain height, really -- flowers closer to water, trees further from) and base the probability
//       of placement on the flora intensity map? So many possibilities...

// export const FloraInfo = {
//   None: 0,
//   Flowers: 1,
//   Bushes: 2
// };

const VARIANT_CHANCE = 0.15;

export class TileMap {
  readonly rows: number;
  readonly cols: number;
  readonly tileSize = TILE_SIZE;

  readonly groundInfos: Array< TileInfo >;
  readonly groundMap: Array< number >;

  readonly canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;

  // #nodeMap = new Array< Node >();
  // #nodeList = new Array< Node >();  // unordered list of all nodes for internal use

  constructor( cols: number, rows: number, 
    groundInfos: Array< TileInfo >, 
    groundMap: Array< number > = Array( cols * rows ).fill( 0 )
  ) {
    this.cols = cols;
    this.rows = rows;
    this.groundMap = groundMap;
    this.groundInfos = groundInfos;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.cols * TILE_SIZE;
    this.canvas.height = this.rows * TILE_SIZE;
    this.#ctx = this.canvas.getContext('2d');

    for ( let row = -1; row < this.rows; row ++ ) {
      for ( let col = -1; col < this.cols; col ++ ) {
        this.drawTile( col, row );
      }
    }
    // this.#prepareNodes();
  }
    
  // #prepareNodes() {
  //   this.#nodeMap = Array.from(Array(this.#cols), () => Array(this.#rows).fill(null));

  //   for (let row = 0; row < this.#rows; row ++) {
  //     for (let col = 0; col < this.#cols; col ++) {
  //       if (this.getTileAt(col, row).isPassable) {
  //         const node = new Node(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2);

  //         Node.linkNodes(node, this.getNodeAt(col - 1, row));
  //         Node.linkNodes(node, this.getNodeAt(col, row - 1));

  //         // Allow diagonal paths, as long as it's properly passable
  //         if (this.getTileAt(col, row - 1)?.isPassable) {
  //           if (this.getTileAt(col - 1, row)?.isPassable) {
  //             Node.linkNodes(node, this.getNodeAt(col - 1, row - 1));
  //           }
  //           if (this.getTileAt(col + 1, row)?.isPassable) {
  //             Node.linkNodes(node, this.getNodeAt(col + 1, row - 1));
  //           }
  //         }
          
  //         this.#nodeMap[ col + row * this.#cols ] = node;
  //         this.#nodeList.push(node);
  //       }
  //     }
  //   }
  // }

  // get width()  { return this.#cols * TILE_SIZE; }
  // get height() { return this.#rows * TILE_SIZE; }

  getTileAt( col: number, row: number ): TileInfo {
    if ( 0 <= col && col < this.cols && 0 <= row && row < this.rows ) {
      return this.groundInfos[ this.groundMap[ col + row * this.cols ] ];
    }

    return null;
  }

  setTileAt( col: number, row: number, tileIndex: number ): void {
    if ( 0 <= col && col < this.cols && 0 <= row && row < this.rows ) {
      this.groundMap[ col + row * this.cols ] = tileIndex;

      [ -1, 0 ].forEach( r => {
        [ -1, 0 ].forEach( c => {
          this.drawTile( col + c, row + r );
        });
      });
    }
  }

  // getRandomNode(): Node {
  //   return this.#nodeList[ Math.floor( Math.random() * this.#nodeList.length ) ];
  // }

  // getNodeAt( col: number, row: number ): Node {
  //   if (0 <= col && 0 <= row && col < this.#cols && row < this.#rows) {
  //     return this.#nodeMap[ col + row * this.#cols ];
  //   }

  //   return null;
  // }

  // nodeFor( x: number, y: number ): Node {
  //   const col = Math.floor( x / TILE_SIZE );
  //   const row = Math.floor( y / TILE_SIZE );    
  //   return this.getNodeAt( col, row );
  // }

  drawTile( col: number, row: number ): void {
    const wCol = Math.max( 0, col ), eCol = Math.min( col + 1, this.cols - 1 );
    const nRow = Math.max( 0, row ), sRow = Math.min( row + 1, this.rows - 1 );

    const nw = this.groundMap[ wCol + nRow * this.cols ];
    const ne = this.groundMap[ eCol + nRow * this.cols ];
    const sw = this.groundMap[ wCol + sRow * this.cols ];
    const se = this.groundMap[ eCol + sRow * this.cols ];

    const layers = new Set( [ nw, ne, sw, se ].sort() );

    let firstLayer = true;

    layers.forEach( tile => {
      const isNW = ( nw == tile || firstLayer ) ? 1 : 0;
      const isNE = ( ne == tile || firstLayer ) ? 1 : 0;
      const isSW = ( sw == tile || firstLayer ) ? 1 : 0;
      const isSE = ( se == tile || firstLayer ) ? 1 : 0;

      firstLayer = false;

      const tileInfo = this.groundInfos[ tile ];

      const coordsList = TILE_COORDS[ isNW * 8 + isNE * 4 + isSW * 2 + isSE ];
      const index = Math.random() < VARIANT_CHANCE ? Math.floor( Math.random() * coordsList.length ) : 0;
      const coords = coordsList[ index ];

      const src = TILE_IMAGES.get( tileInfo.src );
      const sheetX = ( ( tileInfo.col ?? 0 ) + coords[ 0 ] ) * TILE_SIZE;
      const sheetY = ( ( tileInfo.row ?? 0 ) + coords[ 1 ] ) * TILE_SIZE;
      const destX = col * TILE_SIZE + TILE_SIZE / 2;
      const destY = row * TILE_SIZE + TILE_SIZE / 2;

      this.#ctx.drawImage( src, sheetX, sheetY, TILE_SIZE, TILE_SIZE, destX, destY, TILE_SIZE, TILE_SIZE );
    } );
}

}

// async function createTileSheet(): Promise< HTMLCanvasElement > {
//   const timeStr = `Creating tileSheet`;
//   console.time( timeStr );

//   const TILES_SHEET = new Image();
//   TILES_SHEET.src = '../images/tiles.png';
//   await TILES_SHEET.decode();

//   const TERRAIN_SHEET_WIDTH = TILE_SIZE * 3;
//   const TERRAIN_SHEET_HEIGHT = TILE_SIZE * 7;

//   const canvas = document.createElement( 'canvas' ) as HTMLCanvasElement;
//   canvas.width = TileInfos.length * TERRAIN_SHEET_WIDTH;
//   canvas.height = TERRAIN_SHEET_HEIGHT;
//   const ctx = canvas.getContext( '2d' );

//   let destX = 0;
//   tileInfos.forEach(tileInfo => {
//     const sheetX = tileInfo.sheetIndex * TERRAIN_SHEET_WIDTH;

//     ctx.filter = tileInfo.filter ?? 'none';
    
//     ctx.drawImage(TILES_SHEET, 
//       sheetX, 0, TERRAIN_SHEET_WIDTH, TERRAIN_SHEET_HEIGHT,
//       destX, 0, TERRAIN_SHEET_WIDTH, TERRAIN_SHEET_HEIGHT);

//     destX += TERRAIN_SHEET_WIDTH;
//   });

//   console.timeEnd( timeStr );
//   return canvas;
// }

// function drawFlora(ctx, col, row, flora) {
//   if (flora == FloraInfo.Flowers) {
//     const sheetX = (10 + Math.floor(Math.random() * 5)) * TILE_SIZE;
//     const sheetY = ( 0 + Math.floor(Math.random() * 4)) * TILE_SIZE;
//     const destX = col * TILE_SIZE;
//     const destY = row * TILE_SIZE;

//     ctx.drawImage(PLANTS_SHEET, sheetX, sheetY, TILE_SIZE, TILE_SIZE, destX, destY, TILE_SIZE, TILE_SIZE);
//   }

//   if (flora == FloraInfo.Bushes) {
//     const sheetX = ( 6 + Math.floor(Math.random() * 3) * 2) * TILE_SIZE;
//     const sheetY = (22 + Math.floor(Math.random() * 2) * 2) * TILE_SIZE;
//     const destX = col * TILE_SIZE - TILE_SIZE / 2;
//     const destY = row * TILE_SIZE - TILE_SIZE / 2;

//     ctx.drawImage(PLANTS_SHEET, sheetX, sheetY, TILE_SIZE*2, TILE_SIZE*2, destX, destY, TILE_SIZE*2, TILE_SIZE*2);
//   }
// }
