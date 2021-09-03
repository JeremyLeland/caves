import { Sprite, SpriteInfo } from "./Sprite.js";
import { PathfindingNode } from "./Pathfinding.js";

// TODO: Get from TileSet instead
const TILE_SIZE = 32;

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
  
  // These values are used internally, and are set when we load the TileSet
  zIndex?: number;
  image?: HTMLImageElement;
}

export interface ActorInfo {
  layers: Array< string >;
  spriteInfoKey: string;
  life: number;
  speed: number;

  // These values are used internally, and are set when we load the ActorInfo
  sprite?: Sprite;
}

export interface TileSet {
  tileWidth: number;
  tileHeight: number;
  ground: Array< TileInfo >;
  props?: Array< TileInfo >;
  
  // These values are used internally, and are set when we load the TileSet
  jsonPath?: string;
}

export interface ActorSet {
  spriteInfoPath: string;
  actors: Array< ActorInfo >;

  // These values are used internally, and are set when we load the ActorSet
  jsonPath?: string;
}

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

interface Cell {
  groundInfoKey: string;
  propInfoKey?: string;
  actorInfoKey?: string;
  pathfindingNode?: Node;
}

const VARIANT_CHANCE = 0.15;

// TODO: Replace with Array of coordinates for each index
interface EntityJSON {
  row: number;
  col: number;
  index: number;
}

interface TileMapJSON {
  rows: number;
  cols: number;
  tileSetPath: string;
  tileInfoKeys?: Array< string >;
  groundMap?: Array< number >;
  // TODO: Make these objects instead of Maps so we can JSONify?
  props?: Object;
  actorSetPath: string;
  actors?: Object;
}

export class TileMap {
  rows: number;
  cols: number;
  cells = new Array< Cell >();
  pathfindingNodes = new Array< PathfindingNode >();  // unordered list of all nodes for internal use

  readonly tileSet: TileSet;
  readonly actorSet: ActorSet;

  static async fromJson( json: TileMapJSON ) { 
    const tileSet = await loadTileSet( json.tileSetPath );
    const actorSet = await loadActorSet( json.actorSetPath );
    const tileMap = new TileMap( json.cols, json.rows, tileSet, actorSet );

    json.groundMap?.forEach( ( groundInfoIndex, index ) => {
      const key = json.tileInfoKeys[ groundInfoIndex ];
      tileMap.cells[ index ].groundInfoKey = key;
    })

    for ( let key in json.props ) {
      json.props[ key ].forEach( index => 
        tileMap.cells[ index ].propInfoKey = key
      );
    }

    for ( let key in json.actors ) {
      json.actors[ key ].forEach( index => 
        tileMap.cells[ index ].actorInfoKey = key
      );
    }

    return tileMap;
  }

  constructor( cols: number, rows: number, tileSet: TileSet, actorSet: ActorSet ) {
    this.cols = cols;
    this.rows = rows;

    this.tileSet = tileSet;
    this.actorSet = actorSet;

    this.cells = Array.from( Array( cols * rows ), _ => ( {
      groundInfoKey: 'Empty'   // TODO: Don't assume 'Empty' will exist?
    } ) );

    this.#updatePathfinding();
  }

  toJson() : TileMapJSON {
    const tileInfoKeys = new Map< string, number >();
    const groundMap = new Array< number >();
    const propIndices = new Object();// Map< string, Array< number > >();
    const actorIndices = new Object();//Map< string, Array< number > >();

    let tileInfoIndex = 0;
    this.cells.forEach( ( cell, index ) => {
      if ( !tileInfoKeys.has( cell.groundInfoKey ) ) {
        tileInfoKeys.set( cell.groundInfoKey, tileInfoIndex++ );
      }

      groundMap.push( tileInfoKeys.get( cell.groundInfoKey ) );

      if ( cell.propInfoKey ) {
        if ( !propIndices[ cell.propInfoKey ] ) {
          propIndices[ cell.propInfoKey ] = new Array< number >();
        }
        propIndices[ cell.propInfoKey ].push( index );
      }

      if ( cell.actorInfoKey ) {
        if ( !actorIndices[ cell.actorInfoKey ] ) {
          actorIndices[ cell.actorInfoKey ] = new Array< number >();
        }
        actorIndices[ cell.actorInfoKey ].push( index );
      }
    });

    return {
      cols: this.cols,
      rows: this.rows,
      tileSetPath: this.tileSet.jsonPath,
      tileInfoKeys: Array.from( tileInfoKeys.keys() ),
      actorSetPath: this.actorSet.jsonPath,
      groundMap: groundMap,
      props: propIndices,
      actors: actorIndices
    };
  }

  getPassabilityMap() {
    return Array.from( this.cells, cell => 
      cell.propInfoKey ? 
        this.tileSet.props[ cell.propInfoKey ].isPassable : 
        this.tileSet.ground[ cell.groundInfoKey ].isPassable
    );
  }

  #updatePathfinding() {
    this.pathfindingNodes = PathfindingNode.generateNodes( 
      this.cols, this.rows, this.getPassabilityMap(), TILE_SIZE
    );
  }
    
  get width()  { return this.cols * TILE_SIZE; }
  get height() { return this.rows * TILE_SIZE; }

  // getTileAt( col: number, row: number ): TileInfo {
  //   if ( 0 <= col && col < this.cols && 0 <= row && row < this.rows ) {
  //     return this.tileInfos[ this.groundMap[ col + row * this.cols ] ];
  //   }

  //   return null;
  // }

  setGround( col: number, row: number, tileInfoKey: string ): void {
    if ( 0 <= col && col < this.cols && 0 <= row && row < this.rows ) {
      this.cells[ col + row * this.cols ].groundInfoKey = tileInfoKey;
      this.#updatePathfinding();
    }
  }

  setProp( col: number, row: number, tileInfoKey: string ): void {
    if ( 0 <= col && col < this.cols && 0 <= row && row < this.rows ) {
      this.cells[ col + row * this.cols ].propInfoKey = tileInfoKey;
      this.#updatePathfinding();
    }
  }

  setActor( col: number, row: number, actorInfoKey: string ): void {
    if ( 0 <= col && col < this.cols && 0 <= row && row < this.rows ) {
      this.cells[ col + row * this.cols ].actorInfoKey = actorInfoKey;
    }
  }

  insertRow( rowIndex: number, count = 1 ) {
    const sliceOffset = rowIndex <= this.rows - count ? 0 : -count * this.cols; // duplicate previous rows if inserting at end
    const index = rowIndex * this.cols;

    // Need to deep copy these to avoid weirdness
    const toCopy = this.cells.slice( index + sliceOffset, index + sliceOffset + this.cols * count);
    this.cells.splice( index, 0, 
      ...Array.from( toCopy, cell => { return { groundInfoKey: cell.groundInfoKey } } ) );

    this.rows += count;
    this.#updatePathfinding();
  }

  insertCol( colIndex: number, count = 1 ) {
    const sliceOffset = colIndex <= this.cols - count ? 0 : -count; // duplicate previous col if inserted at end
    for ( let index = colIndex, row = 0; 
          row < this.rows; 
          row ++, index += this.cols + count ) {  // account for inserted items!
      const toCopy = this.cells.slice( index + sliceOffset, index + sliceOffset + count )
      this.cells.splice( index, 0, 
        ...Array.from( toCopy, cell => { return { groundInfoKey: cell.groundInfoKey } } ) );
    }

    this.cols += count;
    this.#updatePathfinding();
  }

  deleteRow( rowIndex: number, count = 1 ) {
    const index = rowIndex * this.cols, num = this.cols * count;
    this.cells.splice( index, num );
    this.rows -= count;
    this.#updatePathfinding();
  }

  deleteCol( colIndex: number, count = 1 ) {
    for ( let index = colIndex, row = 0;
          row < this.rows; 
          row ++, index += this.cols - count ) {    // account for removed items!
      this.cells.splice( index, count );
    }

    this.cols -= count;
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

  drawGround( ctx: CanvasRenderingContext2D ) {
    for ( let row = -1; row < this.rows; row ++ ) {
      for ( let col = -1; col < this.cols; col ++ ) {
        this.drawGroundAt( ctx, col, row );
      }
    }
  }

  drawGroundAt( ctx: CanvasRenderingContext2D, col: number, row: number ): void {
    const wCol = Math.max( 0, col ), eCol = Math.min( col + 1, this.cols - 1 );
    const nRow = Math.max( 0, row ), sRow = Math.min( row + 1, this.rows - 1 );

    const nw = this.#getGroundInfo( wCol, nRow );
    const ne = this.#getGroundInfo( eCol, nRow );
    const sw = this.#getGroundInfo( wCol, sRow );
    const se = this.#getGroundInfo( eCol, sRow );

    const layers = new Set( [ nw, ne, sw, se ].sort( ( a, b ) => a.zIndex - b.zIndex ) );

    layers.forEach( tileInfo => {
      const isNW = nw == tileInfo ? 1 : 0;
      const isNE = ne == tileInfo ? 1 : 0;
      const isSW = sw == tileInfo ? 1 : 0;
      const isSE = se == tileInfo ? 1 : 0;

      const coordsList = TILE_COORDS[ isNW * 8 + isNE * 4 + isSW * 2 + isSE ];

      // TODO: Use the noise function for this (so it doesn't keep changing)
      const index = Math.random() < VARIANT_CHANCE ? Math.floor( Math.random() * coordsList.length ) : 0;
      const coords = coordsList[ index ];

      const src = tileInfo.image;

      // TODO: Handle tiles within sheets (with coords)
      const sheetX = ( /*( tileInfo.col ?? 0 ) +*/ coords[ 0 ] ) * TILE_SIZE;
      const sheetY = ( /*( tileInfo.row ?? 0 ) +*/ coords[ 1 ] ) * TILE_SIZE;
      const destX = col * TILE_SIZE + TILE_SIZE / 2;
      const destY = row * TILE_SIZE + TILE_SIZE / 2;

      ctx.drawImage( src, 
        sheetX, sheetY, TILE_SIZE, TILE_SIZE, 
        destX, destY, TILE_SIZE, TILE_SIZE );
    } );
  }

  drawPropAt( ctx: CanvasRenderingContext2D, col: number, row: number ) {
    if ( 0 <= col && col < this.cols && 0 <= row && row < this.rows ) {
      const tileInfo = this.#getPropInfo( col, row );

      if ( tileInfo ) {
        const src = tileInfo.image;

        let dirInfo : DirectionInfo;

        if ( tileInfo.directions ) {
          const n = row < 0 ? false : tileInfo == this.#getPropInfo( col, row - 1 );
          const w = col < 0 ? false : tileInfo == this.#getPropInfo( col - 1, row );
          const e = col >= this.cols - 1 ? false : tileInfo == this.#getPropInfo( col + 1, row );
          const s = row >= this.rows - 1 ? false : tileInfo == this.#getPropInfo( col, row + 1);

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

        ctx.drawImage( src, sheetX, sheetY, w, h, destX, destY, w, h );
      }
    }
  }

  drawActorAt( ctx: CanvasRenderingContext2D, col: number, row: number ) {
    if ( 0 <= col && col < this.cols && 0 <= row && row < this.rows ) {
      const actorInfo = this.#getActorInfo( col, row );

      if ( actorInfo ) {
        actorInfo.sprite.draw( ctx, 
          ( col + 0.5 ) * TILE_SIZE, 
          ( row + 0.5 ) * TILE_SIZE, 
          Math.PI / 2 );
      }
    }
  }

  #getGroundInfo( col:number, row: number ) : TileInfo {
    const index =  col + row * this.cols;
    return this.tileSet.ground[ this.cells[ index ].groundInfoKey ];
  }

  #getPropInfo( col: number, row: number ) : TileInfo {
    const index =  col + row * this.cols;
    return this.tileSet.props[ this.cells[ index ].propInfoKey ];
  }

  #getActorInfo( col: number, row: number ) : ActorInfo {
    const index =  col + row * this.cols;
    return this.actorSet.actors[ this.cells[ index ].actorInfoKey ];
  }
}

async function loadTileSet( tileSetPath: string ) {
  // TODO: Some error handling here
  const tileSet = await ( await fetch( tileSetPath ) ).json() as TileSet;
  tileSet.jsonPath = tileSetPath;

  const tileImages = new Map< string, HTMLImageElement >();
  const imagePromises = new Array< Promise< void > >();

  let zIndex = 0;
  [ tileSet.ground, tileSet.props ].forEach( tileInfos => {
    for ( let name in tileInfos ) {
      const tileInfo = tileInfos[ name ];

      if ( !tileImages.has( tileInfo.src ) ) {
        const image = new Image();
        image.src = `../images/${ tileInfo.src }`;
        imagePromises.push( image.decode() );

        tileImages.set( tileInfo.src, image );
      }

      tileInfo.zIndex = zIndex ++;    // Not used by props, but doesn't hurt anything
      tileInfo.image = tileImages.get( tileInfo.src );
    }
  });

  await Promise.all( imagePromises );

  return tileSet;
}

async function loadActorSet( actorSetPath: string ) {
  // TODO: Some error handling here
  const actorSet = await ( await fetch( actorSetPath ) ).json() as ActorSet;
  actorSet.jsonPath = actorSetPath;

  const spriteResult = await fetch( actorSet.spriteInfoPath );
  const spriteInfos = await ( spriteResult.json() ) as Map< string, SpriteInfo >;

  for ( let name in actorSet.actors ) { 
    const actorInfo = actorSet.actors[ name ];

    actorInfo.sprite = await Sprite.fromLayers( actorInfo.layers, spriteInfos[ actorInfo.spriteInfoKey ] );
  }
  
  return actorSet;
}

function noise( x: number, y: number ) {
  // borrowing from https://stackoverflow.com/questions/12964279/whats-the-origin-of-this-glsl-rand-one-liner
  return ( Math.abs( Math.sin( x * 12.9898 + y * 78.233 ) ) * 43758.5453 ) % 1;
}
