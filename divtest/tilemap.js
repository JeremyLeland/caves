import { Actor } from './actor.js';
import { PathfindingNode } from './pathfinding.js';


export const TileSize = 32;   // TODO: Does this make more sense as a constant somewhere else?

// TODO: Should we keep track of Actors in tileMap, or just ground and props?
// Maybe level keeps track of actors?
export const MapLayer = {
  Ground: 0, Props: 1, Actors: 2
};

export const tileInfos = await ( await fetch( './tileInfos.json' ) ).json();
export const propInfos = await ( await fetch( './propInfos.json' ) ).json();
prepareCSS();

function prepareCSS() {
  const styleSheet = document.styleSheets[ 0 ];

  // Make zIndex negative so ground will draw below props and actors
  let zIndex = -Object.keys( tileInfos ).length;
  for ( let tileInfoKey in tileInfos ) {
    const tileInfo = tileInfos[ tileInfoKey ];
    styleSheet.insertRule( `.${ tileInfoKey }>.tile {
      background-image: url( ${ tileInfo.src.path } );
      z-index: ${ zIndex ++ };
    }` );
  }

  // TODO: Put this in a json?
  const template = {
    cols: 3,
    rows: 7,
    layout: [
      '',       '.NW.NE.SW',    '.NW.NE.SE',
      '',       '.NW.SW.SE',    '.NE.SW.SE',
      '.SE',    '.SW.SE',       '.SW',
      '.NE.SE', '.NW.NE.SW.SE', '.NW.SW',
      '.NE',    '.NW.NE',       '.NW',
      '.var1',  '.var2',        '.var3',
      '.NE.SW', '.NW.SE',       ''
    ]
  };

  for ( let index = 0, row = 0; row < template.rows; row ++ ) {
    for ( let col = 0; col < template.cols; col ++, index ++ ) {
      const layout = template.layout[ index ];
      if ( layout != '' ) {
        styleSheet.insertRule( `${ layout } { 
          background-position: -${ col * TileSize } -${ row * TileSize };
        }` );
      }
    }
  }

  for ( let propInfoKey in propInfos ) {
    const propInfo = propInfos[ propInfoKey ];
    styleSheet.insertRule( `.${ propInfoKey } { 
      background-image: url( ${ propInfo.src.path } );
      width:  ${ ( propInfo.size?.cols ?? 1 ) * TileSize }; 
      height: ${ ( propInfo.size?.rows ?? 1 ) * TileSize };
      margin-left: ${ ( -propInfo.offset?.cols ?? 0 ) * TileSize };
      margin-top:  ${ ( -propInfo.offset?.rows ?? 0 ) * TileSize };
      background-position: -${ propInfo.src.col * TileSize } -${ propInfo.src.row * TileSize };
    }` );
  }
}

const SVG_URI = 'http://www.w3.org/2000/svg';

class Cell {
  constructor( col, row, tileInfoKey ) {
    this.x = ( col + 0.5 ) * TileSize;
    this.y = ( row + 0.5 ) * TileSize;

    this.neighbors = new Map();
    this.tileInfoKey = tileInfoKey;
    this.propInfoKey = null;
    this.actorInfoKey = null;

    this.passable = tileInfos[ tileInfoKey ].passable;

    this.cellDiv = createCellDiv();
    this.propDiv = null;
    this.actor = null;
    this.pathsSVG = document.createElementNS( SVG_URI, 'path' );
  }
}

export class TileMap {
  #tileMapDiv;

  constructor( json ) {
    this.cols = json.ground.cols;
    this.rows = json.ground.rows;
    this.cells = [];

    // Need to create all cells before we can start linking them
    for ( let index = 0, row = 0; row < this.rows; row ++ ) {
      for ( let col = 0; col < this.cols; col ++, index ++ ) {
        const tileInfoKey = json.ground.tileInfoKeys[ 
          json.ground.tileMap[ index ] 
        ];

        this.cells[ index ] = new Cell( col, row, tileInfoKey );
      }
    }

    for ( let propInfoKey in json.props ) {
      json.props[ propInfoKey ].forEach( index => {
        this.cells[ index ].propInfoKey = propInfoKey
        this.cells[ index ].passable = propInfos[ propInfoKey ].passable;
      });
    }

    for ( let actorInfoKey in json.actors ) {
      json.actors[ actorInfoKey ].forEach( index => {
        this.cells[ index ].actorInfoKey = actorInfoKey;
      });
    }
    
    this.#tileMapDiv = document.createElement( 'div' );
    this.#tileMapDiv.className = 'tileMap';
    this.#tileMapDiv.style.width = this.cols * TileSize;
    this.#tileMapDiv.style.height = this.rows * TileSize;

    const grid = document.createElement( 'div' );
    grid.className = 'grid';
    this.#tileMapDiv.appendChild( grid );

    this.pathfindingSVG = document.createElementNS( SVG_URI, 'svg' );
    this.pathfindingSVG.setAttribute( 'class', 'pathfinding nodeMap' );
    
    for ( let index = 0, row = 0; row < this.rows; row ++ ) {
      for ( let col = 0; col < this.cols; col ++, index ++ ) {
        const cell = this.cells[ index ];
        
        cell.neighbors.set( 'NW', this.getCell( col - 1, row - 1 ) );
        cell.neighbors.set( 'N',  this.getCell( col    , row - 1 ) );
        cell.neighbors.set( 'NE', this.getCell( col + 1, row - 1 ) );
        cell.neighbors.set( 'W',  this.getCell( col - 1, row     ) );
        cell.neighbors.set( 'E',  this.getCell( col + 1, row     ) );
        cell.neighbors.set( 'SW', this.getCell( col - 1, row + 1 ) );
        cell.neighbors.set( 'S',  this.getCell( col    , row + 1 ) );
        cell.neighbors.set( 'SE', this.getCell( col + 1, row + 1 ) );

        this.updateCellTile( cell );
        this.#tileMapDiv.appendChild( cell.cellDiv );

        this.updateCellPathfinding( cell );
        this.pathfindingSVG.appendChild( cell.pathsSVG );

        this.updateCellProp( cell );
        this.updateCellActor( cell );
      }
    }

    this.levelDiv = document.createElement( 'div' );
    this.levelDiv.className = 'level';
    this.levelDiv.appendChild( this.#tileMapDiv );
    this.levelDiv.appendChild( this.pathfindingSVG );
  }

  getCell( col, row ) {
    return 0 <= col && col < this.cols && 0 <= row && row < this.rows ? 
      this.cells[ col + row * this.cols ] : null;
  }

  #isPassable( cell ) {
    return cell.propInfoKey ? propInfos[ cell.propInfoKey ].passable : 
      tileInfos[ cell.tileInfoKey ].passable;
  }

  #addPathfindingNode( col, row ) {
    const index = col + row * this.cols;
    const cell = this.cells[ index ];
    cell.pathfindingNode = new PathfindingNode( cell.x, cell.y );
    this.pathfindingSVG.appendChild( cell.pathfindingNode.svg );
    this.pathfindingSVG.appendChild( cell.pathfindingNode.linksSVG );

    if ( col > 0 ) linkCells( cell, this.cells[ index - 1 ] );
    if ( row > 0 ) linkCells( cell, this.cells[ index - this.cols ] );
    if ( col < this.cols - 1 )  linkCells( cell, this.cells[ index + 1 ] );
    if ( row < this.rows - 1 )  linkCells( cell, this.cells[ index + this.cols ] );

    if ( col > 0 && row > 0 ) linkCells( cell, this.cells[ index - this.cols - 1 ] );
    if ( col < this.cols - 1 && row > 0 ) linkCells( cell, this.cells[ index - this.cols + 1 ] );
    if ( col > 0 && row < this.rows - 1 ) linkCells( cell, this.cells[ index + this.cols - 1 ] );
    if ( col < this.cols - 1 && row < this.rows - 1 ) linkCells( cell, this.cells[ index + this.cols + 1 ] );
  }

  #removePathfindingNode( col, row ) {
    const cell = this.cells[ col + row * this.cols ];
    cell.pathfindingNode.linkedNodes.forEach( link => {
      link.linkedNodes.delete( cell.pathfindingNode );
      link.updateSVG();
    } );
    this.pathfindingSVG.removeChild( cell.pathfindingNode.svg );
    this.pathfindingSVG.removeChild( cell.pathfindingNode.linksSVG );
    cell.pathfindingNode = null;
  }

  getNodeAt( x, y ) {
    const col = Math.floor( x / TileSize );
    const row = Math.floor( y / TileSize );
    return this.cells[ col + row * this.cols ].pathfindingNode;
  }

  getRandomNode() {
    const cellsWithNodes = this.cells.filter( cell => cell.pathfindingNode != null );
    return cellsWithNodes[ Math.floor( Math.random() * cellsWithNodes.length ) ].pathfindingNode;
  }

  setKeyAt( { x, y, key, layer } ) {
    const col = Math.floor( x / TileSize );
    const row = Math.floor( y / TileSize );

    const index = col + row * this.cols;
    const cell = this.cells[ index ];

    this.setKeyForCell( cell, key, layer );
  }

  setKeyForCell( cell, key, layer ) {
    let needUpdatePathfinding = false;

    switch ( layer ) {
      case MapLayer.Ground:
        if ( cell.tileInfoKey != key ) {
          cell.tileInfoKey = key;

          // TODO: Update nearby cells

          needUpdatePathfinding = true; 
        }
        break;
      case MapLayer.Props:
        if ( cell.propInfoKey != key ) {
          cell.propInfoKey = key;
          this.updateCellProp( cell, key );
          needUpdatePathfinding = true;
        }
        break;
      case MapLayer.Actors:
        if ( cell.actorInfoKey != key ) {
          cell.actorInfoKey = key;
          this.updateCellActor( cell, key );
        }
        break;
    }

    cell.passable = cell.propInfoKey ? propInfos[ cell.propInfoKey ].passable : 
      tileInfos[ cell.tileInfoKey ].passable;
    
    this.updateCellPathfinding( cell.NW );
    this.updateCellPathfinding( cell.N );
    this.updateCellPathfinding( cell.NE );
    this.updateCellPathfinding( cell.W );
    this.updateCellPathfinding( cell );
    this.updateCellPathfinding( cell.E );
    this.updateCellPathfinding( cell.SW );
    this.updateCellPathfinding( cell.S );
    this.updateCellPathfinding( cell.SE );
  }

  toJson() {
    const tileInfoKeys = new Map();
    const groundMap = [];
    const propIndices = {};
    const actorIndices = {};

    let tileInfoIndex = 0;
    this.cells.forEach( ( cell, index ) => {
      if ( !tileInfoKeys.has( cell.tileInfoKey ) ) {
        tileInfoKeys.set( cell.tileInfoKey, tileInfoIndex++ );
      }
      groundMap.push( tileInfoKeys.get( cell.tileInfoKey ) );

      if ( cell.propInfoKey ) {
        propIndices[ cell.propInfoKey ] ??= [];
        propIndices[ cell.propInfoKey ].push( index );
      }

      if ( cell.actorInfoKey ) {
        actorIndices[ cell.actorInfoKey ] ??= [];
        actorIndices[ cell.actorInfoKey ].push( index );
      }
    });

    return {
      "ground": {
        "cols": this.cols, "rows": this.rows,
        "tileInfoKeys": Array.from( tileInfoKeys.keys() ),
        "tileMap": groundMap,
      }, 
      "props": propIndices, 
      "actors": actorIndices,
    };
  }

  updateCellTile( cell ) {
    cell.cellDiv.className = `cell ${ cell.tileInfoKey }`;

    const floor = tileInfos[ cell.tileInfoKey ].floor ?? false;

    // Edge case fallbacks
    const nw = ( cell.neighbors.get( 'NW' ) ?? cell.neighbors.get( 'N' ) ?? cell.neighbors.get( 'W' ) ?? cell ).tileInfoKey;
    const n  = ( cell.neighbors.get( 'N' )  ?? cell ).tileInfoKey;
    const ne = ( cell.neighbors.get( 'NE' ) ?? cell.neighbors.get( 'N' ) ?? cell.neighbors.get( 'E' ) ?? cell ).tileInfoKey;
    const w  = ( cell.neighbors.get( 'W' )  ?? cell ).tileInfoKey;
    const e  = ( cell.neighbors.get( 'E' )  ?? cell ).tileInfoKey;
    const sw = ( cell.neighbors.get( 'SW' ) ?? cell.neighbors.get( 'S' ) ?? cell.neighbors.get( 'W' ) ?? cell ).tileInfoKey;
    const s  = ( cell.neighbors.get( 'S' )  ?? cell ).tileInfoKey;
    const se = ( cell.neighbors.get( 'SE' ) ?? cell.neighbors.get( 'S' ) ?? cell.neighbors.get( 'E' ) ?? cell ).tileInfoKey;

    const tileClassNameCompare = {
      'tileNW': { 'NW': nw, 'NE': n , 'SW': w  },
      'tileNE': { 'NW': n , 'NE': ne, 'SE': e  },
      'tileSW': { 'NW': w , 'SW': sw, 'SE': s  },
      'tileSE': { 'NE': e , 'SW': s , 'SE': se },
    };

    for ( const [ tile, classNameCompare ] of Object.entries( tileClassNameCompare ) ) {
      const tileClassList = cell.cellDiv[ tile ].classList;
      for ( const [ className, compare ] of Object.entries( classNameCompare ) ) {
        tileClassList.toggle( className, compare == cell.tileInfoKey || floor );
      }
    }
  }

  updateCellPathfinding( cell ) {
    const RADIUS = 5;
    let dStr = '';

    cell.passable = cell.propInfoKey ? propInfos[ cell.propInfoKey ].passable : 
      tileInfos[ cell.tileInfoKey ].passable;

    if ( cell.passable ) {
      dStr += `
        M ${ cell.x - RADIUS } ${ cell.y }
        A ${ RADIUS } ${ RADIUS } 0 0 1 ${ cell.x + RADIUS } ${ cell.y }
        A ${ RADIUS } ${ RADIUS } 0 0 1 ${ cell.x - RADIUS } ${ cell.y }
      `;

      cell.neighbors.forEach( neighbor => {
        if ( neighbor?.passable ) {
          dStr += ` M ${ cell.x } ${ cell.y } L ${ neighbor.x } ${ neighbor.y } `;
        }
      } );
    }

    cell.pathsSVG.setAttribute( 'd', dStr );
  }

  updateCellProp( cell ) {
    if ( cell.propInfoKey ) {
      if ( !cell.propDiv ) {
        cell.propDiv = document.createElement( 'div' );
        cell.cellDiv.appendChild( cell.propDiv );
      }

      cell.propDiv.className = `prop ${ cell.propInfoKey }`;

      const style = cell.propDiv.style;
      // style.transform = `translate( ${ cell.x }px, ${ cell.y }px )`;
      style.zIndex = propInfos[ cell.propInfoKey ].passable ? 0 : cell.y;
    }
    else if ( cell.propDiv ) {
      cell.cellDiv.removeChild( cell.propDiv );
      cell.propDiv = null;
    }
  }

  updateCellActor( cell ) {
    if ( cell.actorDiv ) {
      cell.cellDiv.removeChild( cell.actorDiv );
    }

    if ( cell.actorInfoKey ) {
      const actor = new Actor( cell.actorInfoKey, TileSize / 2, TileSize / 2 );
      cell.actorDiv = actor.spriteDiv;
      cell.cellDiv.appendChild( cell.actorDiv );
    }
    else {
      cell.actorDiv = null;
    }
  }
}

function createCellDiv() {
  const cell = document.createElement( 'div' );

  cell.tileNW = document.createElement( 'div' );
  cell.tileNW.classList.add( 'tile', 'corner_nw', 'SE' );
  cell.appendChild( cell.tileNW );

  cell.tileNE = document.createElement( 'div' );
  cell.tileNE.classList.add( 'tile', 'corner_ne', 'SW' );
  cell.appendChild( cell.tileNE );

  cell.tileSW = document.createElement( 'div' );
  cell.tileSW.classList.add( 'tile', 'corner_sw', 'NE' );
  cell.appendChild( cell.tileSW );

  cell.tileSE = document.createElement( 'div' );
  cell.tileSE.classList.add( 'tile', 'corner_se', 'NW' );
  cell.appendChild( cell.tileSE );

  return cell;
}

function linkCells( a, b ) {
  PathfindingNode.linkNodes( a.pathfindingNode, b.pathfindingNode );
}