//import { Images } from './Images';
//import { Node } from './Pathfinding';

import { Actor } from "Actor";
import { PathfindingNode } from "./Pathfinding.js";

const TILE_SIZE = 32;

// TODO: Combine Direction and TileInfo? 
//       Or make all the coordinate stuff be a separate type?
interface DirectionInfo {
  hasNorth?: boolean;
  hasWest?: boolean;
  hasEast?: boolean;
  hasSouth?: boolean;
  cols?: number;
  rows?: number;
  offsetCols?: number;
  offsetRows?: number;
  coords: Array< Array< number > >;
}

export interface TileInfo {
  src: string;
  coords?: Array< Array< number > >;
  cols?: number;
  rows?: number;
  offsetCols?: number;
  offsetRows?: number;
  directions?: Array< DirectionInfo >;
  isPassable: boolean;
  zIndex?: number;
}

// TODO: Move this to Resources? (Eventually, get it from level file)
export const GroundInfos: Record< string, TileInfo > = {
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

let zIndex = 0;
for ( const key in GroundInfos ) {
  GroundInfos[ key ].zIndex = zIndex ++;
}

// TODO: Some items (trees, bushes) should go "up" from placement
//       Others (e.g. the down-sloping bridge) should go "down" from placement
//       Can probably account for this with + or - rows value, look into this
export const PropInfos: Record< string, TileInfo > = {
  Bush: { 
    src: 'plants.png', 
    coords: [ [ 6, 22 ], [ 8, 22 ], [ 10, 22 ], [ 6, 24 ], [ 8, 24 ], [ 10, 24 ] ],
    cols: 2, rows: 2, 
    offsetCols: 0.5, offsetRows: 0.5,
    isPassable: false 
  },
  Bridge: { 
    src: 'props/bridges.png',
    coords: [ [ 1, 0 ] ],
    directions: [
      { hasEast: true, rows: 2, coords: [ [ 0, 0] ] },
      { hasWest: true, hasEast: true, coords: [ [ 1, 0] ] },
      { hasWest: true, rows: 2, coords: [ [ 2, 0] ] },
      { hasSouth: true, coords: [ [ 0, 2 ] ] },
      { hasNorth: true, hasSouth: true, coords: [ [ 0, 3 ] ] },
      { hasNorth: true, coords: [ [ 0, 4 ] ] },
    ],
    isPassable: true,
  },
  Stump: {
    src: 'plants.png',
    coords: [ [ 0, 24 ], [ 1, 24], [ 0, 25 ], [ 0, 26 ] ],
    isPassable: false
  }
};


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

interface Cell {
  groundInfo: TileInfo;
  propInfo?: TileInfo;
  actor?: Actor;
  pathfindingNode?: Node;
}

const VARIANT_CHANCE = 0.15;

interface TileMapJSON {
  rows: number;
  cols: number;
  tileInfos: Array< TileInfo >;
  groundMap?: Array< number >;
  propMap?: Array< number >;
}

export class TileMap {
  rows: number;
  cols: number;
  readonly tileSize = TILE_SIZE;

  cells = new Array< Cell >();
  #nodeList = new Array< Node >();  // unordered list of all nodes for internal use

  #tileImages: Map< string, HTMLImageElement >;

  // TODO: Don't track these here, just call draw from whoever is using it
  groundCanvas: HTMLCanvasElement;
  propCanvas: HTMLCanvasElement;

  static async fromJson( json: TileMapJSON ) {
    const tileImages = new Map< string, HTMLImageElement >();
    const imagePromises = new Array< Promise< void > >();

    json.tileInfos.forEach( tileInfo => {
      if ( !tileImages.has( tileInfo.src ) ) {
        const image = new Image();
        image.src = `../images/${ tileInfo.src }`;
        imagePromises.push( image.decode() );

        tileImages.set( tileInfo.src, image );
      }
    });

    await Promise.all( imagePromises );

    return new TileMap( json.cols, json.rows,
      json.tileInfos, tileImages, 
      json.groundMap, 
      json.propMap );
  }


  constructor( cols: number, rows: number, 
    tileInfos: Array< TileInfo >,
    tileImages: Map< string, HTMLImageElement >,
    groundMap: Array< number > = Array( cols * rows ).fill( 0 ),
    propMap: Array< number > = Array( cols * rows ).fill( null )
  ) {
    this.cols = cols;
    this.rows = rows;

    this.#tileImages = tileImages;

    groundMap.forEach( ( groundInfoIndex, index ) => {
      this.cells.push( {
        groundInfo: tileInfos[ groundInfoIndex ],
        propInfo: tileInfos[ propMap[ index ] ],
      });
    })

    this.groundCanvas = document.createElement('canvas');
    this.propCanvas = document.createElement('canvas');

    this.fullRedraw();

    this.#nodeList = PathfindingNode.generateNodes( 
      this.cols, this.rows, this.getPassabilityMap(), TILE_SIZE
    );
  }

  getPassabilityMap() {
    return Array.from( this.cells, cell => 
      cell.propInfo?.isPassable ?? cell.groundInfo.isPassable
    );
  }
    
  // get width()  { return this.#cols * TILE_SIZE; }
  // get height() { return this.#rows * TILE_SIZE; }

  // getTileAt( col: number, row: number ): TileInfo {
  //   if ( 0 <= col && col < this.cols && 0 <= row && row < this.rows ) {
  //     return this.tileInfos[ this.groundMap[ col + row * this.cols ] ];
  //   }

  //   return null;
  // }

  setGround( col: number, row: number, tileInfo: TileInfo ): void {
    if ( 0 <= col && col < this.cols && 0 <= row && row < this.rows ) {
      this.cells[ col + row * this.cols ].groundInfo = tileInfo;

      // TODO: Caller will update ground directly (if they so choose)
      [-1, 0 ].forEach( r => {
        [-1, 0 ].forEach( c => {
          this.drawGround( col + c, row + r );
        } );
      } );
    }
  }

  setProp( col: number, row: number, tileInfo: TileInfo ): void {
    if ( 0 <= col && col < this.cols && 0 <= row && row < this.rows ) {
      this.cells[ col + row * this.cols ].propInfo = tileInfo;

      // TODO: Figure out how to clear/redraw a smaller area?
      //       This gets complicated since everything can be different sizes
      //       depending on how it's facing, and things can overlap
      this.propCanvas.getContext( '2d' ).clearRect(
        0, 0, this.propCanvas.width, this.propCanvas.height
      );

      // TODO: This doesn't really make sense here, since this will have to be drawn
      //       intermingled with Actors by the world eventually
      for ( let row = 0; row < this.rows; row++ ) {
        for ( let col = 0; col < this.cols; col++ ) {
          this.drawProp( col, row );
        }
      }
    }
  }

  insertRow( rowIndex: number, count = 1 ) {
    const sliceOffset = rowIndex <= this.rows - count ? 0 : -count * this.cols; // duplicate previous rows if inserting at end
    const index = rowIndex * this.cols;

    // Need to deep copy these to avoid weirdness
    const toCopy = this.cells.slice( index + sliceOffset, index + sliceOffset + this.cols * count);
    this.cells.splice( index, 0, 
      ...Array.from( toCopy, cell => { return { groundInfo: cell.groundInfo } } ) );

    this.rows += count;
    this.fullRedraw();
  }

  insertCol( colIndex: number, count = 1 ) {
    const sliceOffset = colIndex <= this.cols - count ? 0 : -count; // duplicate previous col if inserted at end
    for ( let index = colIndex, row = 0; 
          row < this.rows; 
          row ++, index += this.cols + count ) {  // account for inserted items!
      const toCopy = this.cells.slice( index + sliceOffset, index + sliceOffset + count )
      this.cells.splice( index, 0, 
        ...Array.from( toCopy, cell => { return { groundInfo: cell.groundInfo } } ) );
    }

    this.cols += count;
    this.fullRedraw();
  }

  deleteRow( rowIndex: number, count = 1 ) {
    const index = rowIndex * this.cols, num = this.cols * count;
    this.cells.splice( index, num );
    this.rows -= count;
    this.fullRedraw();
  }

  deleteCol( colIndex: number, count = 1 ) {
    for ( let index = colIndex, row = 0;
          row < this.rows; 
          row ++, index += this.cols - count ) {    // account for removed items!
      this.cells.splice( index, count );
    }

    this.cols -= count;
    this.fullRedraw();
  }

  fullRedraw() {
    this.groundCanvas.width = this.cols * TILE_SIZE;
    this.groundCanvas.height = this.rows * TILE_SIZE;

    for ( let row = -1; row < this.rows; row ++ ) {
      for ( let col = -1; col < this.cols; col ++ ) {
        this.drawGround( col, row );
        this.drawProp( col, row );
      }
    }

    this.propCanvas.width = this.cols * TILE_SIZE;
    this.propCanvas.height = this.rows * TILE_SIZE;

    for ( let row = 0; row < this.rows; row++ ) {
      for ( let col = 0; col < this.cols; col++ ) {
        this.drawProp( col, row );
      }
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

  drawGround( col: number, row: number ): void {
    const wCol = Math.max( 0, col ), eCol = Math.min( col + 1, this.cols - 1 );
    const nRow = Math.max( 0, row ), sRow = Math.min( row + 1, this.rows - 1 );

    const nw = this.cells[ wCol + nRow * this.cols ].groundInfo;
    const ne = this.cells[ eCol + nRow * this.cols ].groundInfo;
    const sw = this.cells[ wCol + sRow * this.cols ].groundInfo;
    const se = this.cells[ eCol + sRow * this.cols ].groundInfo;

    const layers = new Set( [ nw, ne, sw, se ].sort( ( a, b ) => a.zIndex - b.zIndex ) );

    let firstLayer = true;

    layers.forEach( tileInfo => {
      const isNW = ( nw == tileInfo || firstLayer ) ? 1 : 0;
      const isNE = ( ne == tileInfo || firstLayer ) ? 1 : 0;
      const isSW = ( sw == tileInfo || firstLayer ) ? 1 : 0;
      const isSE = ( se == tileInfo || firstLayer ) ? 1 : 0;

      firstLayer = false;

      const coordsList = TILE_COORDS[ isNW * 8 + isNE * 4 + isSW * 2 + isSE ];
      const index = Math.random() < VARIANT_CHANCE ? Math.floor( Math.random() * coordsList.length ) : 0;
      const coords = coordsList[ index ];

      const src = this.#tileImages.get( tileInfo.src );

      // TODO: Handle tiles within sheets (with coords)
      const sheetX = ( /*( tileInfo.col ?? 0 ) +*/ coords[ 0 ] ) * TILE_SIZE;
      const sheetY = ( /*( tileInfo.row ?? 0 ) +*/ coords[ 1 ] ) * TILE_SIZE;
      const destX = col * TILE_SIZE + TILE_SIZE / 2;
      const destY = row * TILE_SIZE + TILE_SIZE / 2;

      // TODO: Should we cache the context? Not sure if this call is slow or not
      this.groundCanvas.getContext('2d').drawImage( src, 
        sheetX, sheetY, TILE_SIZE, TILE_SIZE, 
        destX, destY, TILE_SIZE, TILE_SIZE );
    } );
  }

  drawProp( col: number, row: number ) {
    if ( 0 <= col && col < this.cols && 0 <= row && row < this.rows ) {
      const index = col + row * this.cols;
      const tileInfo = this.cells[ index ].propInfo;

      if ( tileInfo ) {
        const src = this.#tileImages.get( tileInfo.src );

        let coords = tileInfo.coords;
        let cols = tileInfo.cols ?? 1;
        let rows = tileInfo.rows ?? 1;

        if ( tileInfo.directions ) {
          const n = row < 0 ? false : tileInfo == this.cells[ index - this.cols ].propInfo;
          const w = col < 0 ? false : tileInfo == this.cells[ index - 1 ].propInfo;
          const e = col >= this.cols - 1 ? false : tileInfo == this.cells[ index + 1 ].propInfo;
          const s = row >= this.rows - 1 ? false : tileInfo == this.cells[ index + this.cols ].propInfo;

          const dirInfo = tileInfo.directions.find( dir =>
            ( dir.hasNorth ?? false ) == n && 
            ( dir.hasWest  ?? false ) == w &&
            ( dir.hasEast  ?? false ) == e &&
            ( dir.hasSouth ?? false ) == s
          );

          coords = dirInfo?.coords ?? coords;
          cols = dirInfo?.cols ?? cols;
          rows = dirInfo?.rows ?? rows;
        }

        const [ c, r ] = coords[ Math.floor( noise( col, row ) * coords.length ) ];

        const sheetX = c * TILE_SIZE;
        const sheetY = r * TILE_SIZE;

        const destX = ( col - ( tileInfo.offsetCols ?? 0 ) ) * TILE_SIZE;
        const destY = ( row - ( tileInfo.offsetRows ?? 0 ) ) * TILE_SIZE;

        const w = cols * TILE_SIZE;
        const h = rows * TILE_SIZE;

        // TODO: Should we cache this context? Not sure if this is slow or not...
        const ctx = this.propCanvas.getContext('2d');
        ctx.drawImage( src, sheetX, sheetY, w, h, destX, destY, w, h );
      }
    }
  }
}

function noise( x: number, y: number ) {
  // borrowing from https://stackoverflow.com/questions/12964279/whats-the-origin-of-this-glsl-rand-one-liner
  return ( Math.abs( Math.sin( x * 12.9898 + y * 78.233 ) ) * 43758.5453 ) % 1;
}
