//import { Images } from './Images';
//import { Node } from './Pathfinding';

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

interface TileInfo {
  src: string;
  coords?: Array< Array< number > >;
  cols?: number;
  rows?: number;
  offsetCols?: number;
  offsetRows?: number;
  directions?: Array< DirectionInfo >;
  isPassable: boolean;
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

const TILE_IMAGES = new Map< string, HTMLImageElement >();
const imagePromises = new Array< Promise< void > >();

// TODO: Do this only for provided TileInfos as part of level creation?
for ( let tileInfo in GroundInfos ) {
  const path = GroundInfos[ tileInfo ].src;

  if ( !TILE_IMAGES.has( path ) ) {
    const image = new Image();
    image.src = `../images/${path}`;
    imagePromises.push( image.decode() );

    TILE_IMAGES.set( path, image );
  }
}

for ( let tileInfo in PropInfos ) {
  const path = PropInfos[ tileInfo ].src;

  if ( !TILE_IMAGES.has( path ) ) {
    const image = new Image();
    image.src = `../images/${path}`;
    imagePromises.push( image.decode() );

    TILE_IMAGES.set( path, image );
  }
}

await Promise.all( imagePromises );

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
  rows: number;
  cols: number;
  readonly tileSize = TILE_SIZE;

  tileInfos: Array< TileInfo >;
  groundMap: Array< number >;
  propMap: Array< number >;

  groundCanvas: HTMLCanvasElement;
  propCanvas: HTMLCanvasElement;
  gridCanvas: HTMLCanvasElement;

  // #nodeMap = new Array< Node >();
  // #nodeList = new Array< Node >();  // unordered list of all nodes for internal use

  constructor( cols: number, rows: number, 
    tileInfos: Array< TileInfo >, 
    groundMap: Array< number > = Array( cols * rows ).fill( 0 ),
    propMap: Array< number > = Array( cols * rows ).fill( null )
  ) {
    this.cols = cols;
    this.rows = rows;
    this.tileInfos = tileInfos;
    this.groundMap = groundMap;
    this.propMap = propMap;

    this.groundCanvas = document.createElement('canvas');
    this.propCanvas = document.createElement('canvas');
    this.gridCanvas = document.createElement('canvas');

    this.fullRedraw();

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

  // getTileAt( col: number, row: number ): TileInfo {
  //   if ( 0 <= col && col < this.cols && 0 <= row && row < this.rows ) {
  //     return this.tileInfos[ this.groundMap[ col + row * this.cols ] ];
  //   }

  //   return null;
  // }

  setGround( col: number, row: number, tileIndex: number ): void {
    if ( 0 <= col && col < this.cols && 0 <= row && row < this.rows ) {
      this.groundMap[ col + row * this.cols ] = tileIndex;

      [-1, 0 ].forEach( r => {
        [-1, 0 ].forEach( c => {
          this.drawGround( col + c, row + r );
        } );
      } );
    }
  }

  // TODO: This doesn't really make sense here, since this will have to be drawn
  //       intermingled with Actors by the world eventually
  setProp( col: number, row: number, tileIndex: number ): void {
    if ( 0 <= col && col < this.cols && 0 <= row && row < this.rows ) {
      this.propMap[ col + row * this.cols ] = tileIndex;

      // TODO: Figure out how to clear/redraw a smaller area?
      //       This gets complicated since everything can be different sizes
      //       depending on how it's facing, and things can overlap
      this.propCanvas.getContext( '2d' ).clearRect(
        0, 0, this.propCanvas.width, this.propCanvas.height
      );

      for ( let row = 0; row < this.rows; row++ ) {
        for ( let col = 0; col < this.cols; col++ ) {
          this.drawProp( col, row );
        }
      }
    }
  }

  insertRow( rowIndex: number, count = 1 ) {
    const index = rowIndex * this.cols;
    this.groundMap.splice( index, 0, ...this.groundMap.slice( index, index + this.cols * count) );

    // TODO: Should we repeat the existing row of props here? Makes sense for bridges, not as much
    // for everything else...
    this.propMap.splice( index, 0, ...new Array< number >( this.cols * count ).fill( null ) );
    this.rows += count;
    this.fullRedraw();
  }

  insertCol( colIndex: number, count = 1 ) {
    for ( let index = colIndex, row = 0; row < this.rows; row ++, index += this.cols ) {
      this.groundMap.splice( index, 0, ...this.groundMap.slice( index, index + count ) );

      // TODO: Should we repeat the existing col of props here? Makes sense for bridges, not as much
      // for everything else...
      this.propMap.splice( index, 0, ...new Array<number>( count ).fill( null ) );
    }

    this.cols += count;
    this.fullRedraw();
  }

  deleteRow( rowIndex: number, count = 1 ) {
    const index = rowIndex * this.cols, num = this.cols * count;
    this.groundMap.splice( index, num );
    this.propMap.splice( index, num );
    this.rows -= count;
    this.fullRedraw();
  }

  deleteCol( colIndex: number, count = 1 ) {
    for ( let index = colIndex, row = 0; row < this.rows; row ++, index += this.cols ) {
      this.groundMap.splice( index, count );
      this.propMap.splice( index, count );
    }

    this.cols -= count;
    this.fullRedraw();
  }

  // resize( colsLeft: number, rowsTop: number, colsRight: number, rowsBottom: number ) {
  //   const newCols = this.cols + colsLeft + colsRight;
  //   const newRows = this.rows + rowsTop + rowsBottom;

  //   const fromLeft = Math.max( 0, -colsLeft );
  //   const fromTop  = Math.max( 0, -rowsTop  );
  //   const fromRight  = Math.min( this.cols, this.cols + colsRight  );
  //   const fromBottom = Math.min( this.rows, this.rows + rowsBottom );

  //   const toLeft = Math.max( 0, colsLeft );
  //   const toTop  = Math.max( 0, rowsTop );
  //   const toRight  = Math.min( this.cols, this.cols - colsRight );
  //   const toBottom = Math.min( this.rows, this.rows - rowsBottom );
    
  //   const newGroundMap = new Array( newCols * newRows ).fill( 0 );
  //   const newPropMap = new Array( newCols * newRows ).fill( null );

  //   let fromIndex = 0, toIndex = 0;
  //   for ( let r = 0; r < newRows; r ++ ) {
  //     for ( let c = 0; c < newCols; c ++ ) {
  //       const inFrom = c >= fromLeft && r >= fromTop && c < fromRight && r < fromBottom;
  //       const inTo = c >= toLeft && r >= toTop && c < toRight && r < toBottom;

  //       if ( inFrom && inTo ) {
  //         newGroundMap[ toIndex ] = this.groundMap[ fromIndex ];
  //         newPropMap[ toIndex ] = this.propMap[ toIndex ];
  //       }

  //       if ( inFrom )   fromIndex ++;
  //       if ( inTo )     toIndex ++;
  //     }
  //   }

  //   this.groundMap = newGroundMap;
  //   this.propMap = newPropMap;
  //   this.cols = newCols;
  //   this.rows = newRows;

  //   this.fullRedraw();
  // }

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

    this.gridCanvas.width = this.cols * TILE_SIZE;
    this.gridCanvas.height = this.rows * TILE_SIZE;
    const gridCtx = this.gridCanvas.getContext( '2d' );

    gridCtx.beginPath();

    for ( let row = 0; row < this.rows; row++ ) {
      gridCtx.moveTo( 0.5                        , 0.5 + row * TILE_SIZE );
      gridCtx.lineTo( 0.5 + this.cols * TILE_SIZE, 0.5 + row * TILE_SIZE );
      gridCtx.moveTo( 0.5                        , TILE_SIZE - 0.5 + row * TILE_SIZE );
      gridCtx.lineTo( 0.5 + this.cols * TILE_SIZE, TILE_SIZE - 0.5 + row * TILE_SIZE );
    }
    for ( let col = 0; col < this.cols; col++ ) {
      gridCtx.moveTo( 0.5 + col * TILE_SIZE, 0.5                         );
      gridCtx.lineTo( 0.5 + col * TILE_SIZE, 0.5 + this.rows * TILE_SIZE );
      gridCtx.moveTo( TILE_SIZE - 0.5 + col * TILE_SIZE, 0.5                         );
      gridCtx.lineTo( TILE_SIZE - 0.5 + col * TILE_SIZE, 0.5 + this.rows * TILE_SIZE );
    }

    gridCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    gridCtx.stroke();
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

      const tileInfo = this.tileInfos[ tile ];

      const coordsList = TILE_COORDS[ isNW * 8 + isNE * 4 + isSW * 2 + isSE ];
      const index = Math.random() < VARIANT_CHANCE ? Math.floor( Math.random() * coordsList.length ) : 0;
      const coords = coordsList[ index ];

      const src = TILE_IMAGES.get( tileInfo.src );

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
      const tile = this.propMap[ index ];

      if ( tile ) {
        const tileInfo = this.tileInfos[ tile ];

        const src = TILE_IMAGES.get( tileInfo.src );

        let coords = tileInfo.coords;
        let cols = tileInfo.cols ?? 1;
        let rows = tileInfo.rows ?? 1;

        if ( tileInfo.directions ) {
          const n = row < 0 ? false : tile == this.propMap[ index - this.cols ];
          const w = col < 0 ? false : tile == this.propMap[ index - 1 ];
          const e = col >= this.cols - 1 ? false : tile == this.propMap[ index + 1 ];
          const s = row >= this.rows - 1 ? false : tile == this.propMap[ index + this.cols ];

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
