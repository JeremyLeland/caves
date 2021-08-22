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
  default?: DirectionInfo;   // TODO: better name for this?
  directions?: Array< DirectionInfo >;
  isPassable: boolean;
  zIndex?: number;
}

// TODO: Move this to Resources? 
export const GroundInfos = await ( await fetch( '../json/groundInfos.json' ) ).json();

// Set this separately as part of loading the level?
let zIndex = 0;
for ( const key in GroundInfos ) {
  GroundInfos[ key ].zIndex = zIndex ++;
}

export const PropInfos = await ( await fetch( '../json/propInfos.json' ) ).json();


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

interface PropJSON {
  row: number;
  col: number;
  tileInfoIndex: number;
}

interface TileMapJSON {
  rows: number;
  cols: number;
  tileInfos: Array< TileInfo >;
  groundMap?: Array< number >;
  propList?: Array< PropJSON >;
}

export class TileMap {
  rows: number;
  cols: number;
  readonly tileSize = TILE_SIZE;

  cells = new Array< Cell >();
  pathfindingNodes = new Array< PathfindingNode >();  // unordered list of all nodes for internal use

  #tileImages: Map< string, HTMLImageElement >;

  // TODO: Don't track these here, just call draw from whoever is using it
  groundCanvas: HTMLCanvasElement;
  propCanvas: HTMLCanvasElement;

  // TODO: Don't get extra tile infos here, we're only using them to load the images
  // We should just have the image loading be handled elsewhere
  // Maybe have a static getImage() in Resources? (and have caller load the images
  // before calling fromJson?)
  static async fromJson( json: TileMapJSON, moreTileInfos?: Array< TileInfo > ) {
    const tileImages = new Map< string, HTMLImageElement >();
    const imagePromises = new Array< Promise< void > >();

    const allTileInfos = json.tileInfos;

    // Allow editor to provide additional TileInfos not part of original map
    // We're only using this to load images, so it doesn't matter if there are
    // duplicates (image loading code already handles this)
    if ( moreTileInfos ) {
      allTileInfos.push( ...moreTileInfos );
    }

    allTileInfos.forEach( tileInfo => {
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
      json.propList );
  }

  constructor( cols: number, rows: number, 
    tileInfos: Array< TileInfo >,
    tileImages: Map< string, HTMLImageElement >,
    groundMap: Array< number > = Array( cols * rows ).fill( 0 ),
    propList: Array< PropJSON >
  ) {
    this.cols = cols;
    this.rows = rows;

    this.#tileImages = tileImages;

    groundMap.forEach( groundInfoIndex => {
      this.cells.push( {
        groundInfo: tileInfos[ groundInfoIndex ],
      });
    })

    propList?.forEach( propJson => {
      const index = propJson.col + propJson.row * this.cols;
      const propInfo = tileInfos[ propJson.tileInfoIndex ];
      this.cells[ index ].propInfo = propInfo;
    });

    this.groundCanvas = document.createElement('canvas');
    this.propCanvas = document.createElement('canvas');

    this.fullRedraw();
  }

  toJson() : TileMapJSON {
    const tileInfos = new Map< TileInfo, number >();
    const groundMap = Array< number >();
    const propList = Array< PropJSON >();

    let tileInfoIndex = 0;
    this.cells.forEach( ( cell, index ) => {
      if ( !tileInfos.has( cell.groundInfo ) ) {
        tileInfos.set( cell.groundInfo, tileInfoIndex++ );
      }

      groundMap.push( tileInfos.get( cell.groundInfo ) );

      if ( cell.propInfo ) {
        if ( !tileInfos.has( cell.propInfo ) ) {
          tileInfos.set( cell.propInfo, tileInfoIndex++ );
        }

        const col = index % this.cols;
        const row = Math.floor( index / this.cols );

        propList.push({ col: col, row: row, 
          tileInfoIndex: tileInfos.get( cell.propInfo ) });
      }
    });

    return {
      cols: this.cols,
      rows: this.rows,
      tileInfos: Array.from( tileInfos.keys() ),
      groundMap: groundMap,
      propList: propList,
    };
  }

  getPassabilityMap() {
    return Array.from( this.cells, cell => 
      cell.propInfo?.isPassable ?? cell.groundInfo.isPassable
    );
  }

  #updatePathfinding() {
    this.pathfindingNodes = PathfindingNode.generateNodes( 
      this.cols, this.rows, this.getPassabilityMap(), TILE_SIZE
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

      this.#updatePathfinding();
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

      this.#updatePathfinding();
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

    this.#updatePathfinding();
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

        let dirInfo : DirectionInfo;

        if ( tileInfo.directions ) {
          const n = row < 0 ? false : tileInfo == this.cells[ index - this.cols ].propInfo;
          const w = col < 0 ? false : tileInfo == this.cells[ index - 1 ].propInfo;
          const e = col >= this.cols - 1 ? false : tileInfo == this.cells[ index + 1 ].propInfo;
          const s = row >= this.rows - 1 ? false : tileInfo == this.cells[ index + this.cols ].propInfo;

          dirInfo = tileInfo.directions.find( dir =>
            ( dir.hasNorth ?? false ) == n && 
            ( dir.hasWest  ?? false ) == w &&
            ( dir.hasEast  ?? false ) == e &&
            ( dir.hasSouth ?? false ) == s
          );
        }
        dirInfo ??= tileInfo.default;

        const coords = dirInfo?.coords ?? [ [ 0, 0, ] ];
        const cols = dirInfo?.cols ?? 1;
        const rows = dirInfo?.rows ?? 1;
        const offsetCols = dirInfo?.offsetCols ?? 0;
        const offsetRows = dirInfo?.offsetRows ?? 0;

        const [ c, r ] = coords[ Math.floor( noise( col, row ) * coords.length ) ];

        const sheetX = c * TILE_SIZE;
        const sheetY = r * TILE_SIZE;

        const destX = ( col - offsetCols ) * TILE_SIZE;
        const destY = ( row - offsetRows ) * TILE_SIZE;

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
