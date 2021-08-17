//import { Images } from './Images';
//import { Node } from './Pathfinding';

const TILE_SIZE = 32;

interface DirectionInfo {
  hasNorth?: boolean;
  hasWest?: boolean;
  hasEast?: boolean;
  hasSouth?: boolean;
  coords: Array< Array< number > >;
}

interface TileInfo {
  src: string;
  coords?: Array< Array< number > >;
  cols?: number;
  rows?: number;
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
    isPassable: false },
  Bridge: { 
    src: 'props/bridges.png',
    coords: [ [ 1, 0 ] ],
    directions: [
      { hasEast: true, coords: [ [ 0, 0] ] },
      { hasWest: true, hasEast: true, coords: [ [ 1, 0] ] },
      { hasWest: true, coords: [ [ 2, 0] ] },
      { hasSouth: true, coords: [ [ 0, 2 ] ] },
      { hasNorth: true, hasSouth: true, coords: [ [ 0, 3 ] ] },
      { hasNorth: true, coords: [ [ 0, 4 ] ] },
    ],
    isPassable: true,
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

  readonly tileInfos: Array< TileInfo >;
  readonly groundMap: Array< number >;
  readonly propMap: Array< number >;

  readonly groundCanvas: HTMLCanvasElement;
  propCanvas: HTMLCanvasElement;

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
    this.groundCanvas.width = this.cols * TILE_SIZE;
    this.groundCanvas.height = this.rows * TILE_SIZE;

    for ( let row = -1; row < this.rows; row ++ ) {
      for ( let col = -1; col < this.cols; col ++ ) {
        this.drawGround( col, row );
        this.drawProp( col, row );
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

  setProp( col: number, row: number, tileIndex: number ): void {
    if ( 0 <= col && col < this.cols && 0 <= row && row < this.rows ) {
      const oldTile = this.tileInfos[ this.propMap[ col + row * this.cols ] ];

      if ( oldTile ) {
        // TODO: Share this code with drawing below?
        const w = oldTile.cols ?? 1;
        const h = oldTile.rows ?? 1;

        // Assigned col,row is object base, attempt to center appropriately
        const destX = ( col - ( w - 1) / 2 ) * TILE_SIZE;
        const destY = ( row - ( h - 1) / 2 ) * TILE_SIZE;

        this.propCanvas.getContext( '2d' ).clearRect(
          destX, destY, TILE_SIZE * w, TILE_SIZE * h
        );
      }

      this.propMap[ col + row * this.cols ] = tileIndex;

      // Update tiles around us, in case they were linked
      [ -1, 0, 1 ].forEach( r => {
        [ -1, 0, 1 ].forEach( c => {
          this.drawProp( col + c, row + r );
        } );
      } );
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

        if ( tileInfo.directions ) {
          const n = row < 0 ? false : tile == this.propMap[ index - this.cols ];
          const w = col < 0 ? false : tile == this.propMap[ index - 1 ];
          const e = col >= this.cols - 1 ? false : tile == this.propMap[ index + 1 ];
          const s = row >= this.rows - 1 ? false: tile == this.propMap[ index + this.cols ];

          coords = tileInfo.directions.find( dir =>
            ( dir.hasNorth ?? false ) == n && 
            ( dir.hasWest  ?? false ) == w &&
            ( dir.hasEast  ?? false ) == e &&
            ( dir.hasSouth ?? false ) == s
          )?.coords ?? coords;
        }

        const [ c, r ] = coords[ Math.floor( Math.random() * coords.length ) ];

        const sheetX = c * TILE_SIZE;
        const sheetY = r * TILE_SIZE;

        const w = tileInfo.cols ?? 1;
        const h = tileInfo.rows ?? 1;

        // Assigned col,row is object base, attempt to center appropriately
        const destX = ( col - ( w - 1) / 2 ) * TILE_SIZE;
        const destY = ( row - ( h - 1) / 2 ) * TILE_SIZE;

        // TODO: Should we cache this context? Not sure if this is slow or not...
        const ctx = this.propCanvas.getContext('2d');
        ctx.clearRect( destX, destY, TILE_SIZE * w, TILE_SIZE * h );
        ctx.drawImage( src,
          sheetX, sheetY, TILE_SIZE * w, TILE_SIZE * h,
          destX, destY, TILE_SIZE * w, TILE_SIZE * h );
      }
    }
  }
}