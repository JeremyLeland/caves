import { Actor } from './actor.js';

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
  constructor( tileInfoKey ) {
    this.neighbors = new Map();
    this.tileInfoKey = tileInfoKey;
    this.propInfoKey = null;
    this.actorInfoKey = null;

    this.passable = tileInfos[ tileInfoKey ].passable;

    this.cellDiv = document.createElement( 'div' );
    this.cellDiv.cell = this;

    [ 'tileNW', 'tileNE', 'tileSW', 'tileSE' ].forEach( corner => {
      this[ corner ] = document.createElement( 'div' );
      this[ corner ].classList.add( 'tile', corner );
      this.cellDiv.appendChild( this[ corner ] );
    });

    this.propDiv = null;
    this.actor = null;
    this.pathsSVG = document.createElementNS( SVG_URI, 'path' );
  }

  setNeighbor( dir, neighbor ) {
    if ( neighbor ) {
      this.neighbors.set( dir, neighbor );
    }
    else {
      this.neighbors.delete( dir );
    }
  }

  getRandomNeighbor() {
    const array = [ ...this.neighbors.values() ].filter( e => e.passable );
    return array[ Math.floor( Math.random() * array.length ) ];
  }

  updateTile() {
    this.cellDiv.className = `cell ${ this.tileInfoKey }`;

    const floor = tileInfos[ this.tileInfoKey ].floor ?? false;

    // Edge case fallbacks
    const nw = ( this.neighbors.get( 'NW' ) ?? this.neighbors.get( 'N' ) ?? this.neighbors.get( 'W' ) ?? this ).tileInfoKey;
    const n  = ( this.neighbors.get( 'N' )  ?? this ).tileInfoKey;
    const ne = ( this.neighbors.get( 'NE' ) ?? this.neighbors.get( 'N' ) ?? this.neighbors.get( 'E' ) ?? this ).tileInfoKey;
    const w  = ( this.neighbors.get( 'W' )  ?? this ).tileInfoKey;
    const us = this.tileInfoKey;
    const e  = ( this.neighbors.get( 'E' )  ?? this ).tileInfoKey;
    const sw = ( this.neighbors.get( 'SW' ) ?? this.neighbors.get( 'S' ) ?? this.neighbors.get( 'W' ) ?? this ).tileInfoKey;
    const s  = ( this.neighbors.get( 'S' )  ?? this ).tileInfoKey;
    const se = ( this.neighbors.get( 'SE' ) ?? this.neighbors.get( 'S' ) ?? this.neighbors.get( 'E' ) ?? this ).tileInfoKey;

    const tileClassNameCompare = {
      'tileNW': { 'NW': nw , 'NE': n  , 'SW': w  , 'SE': us },
      'tileNE': { 'NW': n  , 'NE': ne , 'SW': us , 'SE': e  },
      'tileSW': { 'NW': w  , 'NE': us , 'SW': sw , 'SE': s  },
      'tileSE': { 'NW': us , 'NE': e  , 'SW': s  , 'SE': se },
    };

    for ( const [ tile, classNameCompare ] of Object.entries( tileClassNameCompare ) ) {
      const tileClassList = this[ tile ].classList;
      for ( const [ className, compare ] of Object.entries( classNameCompare ) ) {
        tileClassList.toggle( className, compare == this.tileInfoKey || floor );
      }
    }
  }

  updatePathfinding() {
    const RADIUS = 5;
    let dStr = '';

    this.passable = this.propInfoKey ? propInfos[ this.propInfoKey ].passable : 
      tileInfos[ this.tileInfoKey ].passable;

    if ( this.passable ) {
      dStr += `
        M ${ this.x - RADIUS } ${ this.y }
        A ${ RADIUS } ${ RADIUS } 0 0 1 ${ this.x + RADIUS } ${ this.y }
        A ${ RADIUS } ${ RADIUS } 0 0 1 ${ this.x - RADIUS } ${ this.y }
      `;

      this.neighbors.forEach( neighbor => {
        if ( neighbor?.passable ) {
          dStr += ` M ${ this.x } ${ this.y } L ${ neighbor.x } ${ neighbor.y } `;
        }
      } );
    }

    this.pathsSVG.setAttribute( 'd', dStr );
  }

  updateProp() {
    if ( this.propInfoKey ) {
      if ( !this.propDiv ) {
        this.propDiv = document.createElement( 'div' );
        this.cellDiv.appendChild( this.propDiv );
      }

      this.propDiv.className = `prop ${ this.propInfoKey }`;

      const style = this.propDiv.style;
      // style.transform = `translate( ${ this.x }px, ${ this.y }px )`;
      style.zIndex = propInfos[ this.propInfoKey ].passable ? 0 : this.y;
    }
    else if ( this.propDiv ) {
      this.cellDiv.removeChild( this.propDiv );
      this.propDiv = null;
    }
  }

  updateActor() {
    if ( this.actor ) {
      this.cellDiv.removeChild( this.actor.spriteDiv );
    }

    if ( this.actorInfoKey ) {
      this.actor = new Actor( this.actorInfoKey, TileSize / 2, TileSize / 2 );
      this.cellDiv.appendChild( this.actor.spriteDiv );
    }
    else {
      this.actor = null;
    }
  }
}

export class TileMap {
  #tileMapDiv;

  constructor( json ) {
    this.cols = json.ground.cols;
    this.rows = json.ground.rows;
    this.cells = Array.from( json.ground.tileMap, tileInfoIndex =>
      new Cell( json.ground.tileInfoKeys[ tileInfoIndex ] ) 
    );

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

    this.updateCells();

    this.pathfindingSVG = document.createElementNS( SVG_URI, 'svg' );
    this.pathfindingSVG.setAttribute( 'class', 'pathfinding nodeMap' );

    this.cells.forEach( cell => {
      this.#tileMapDiv.appendChild( cell.cellDiv )
      this.pathfindingSVG.appendChild( cell.pathsSVG );
    } );

    this.#tileMapDiv.appendChild( this.pathfindingSVG );

    this.levelDiv = document.createElement( 'div' );
    this.levelDiv.className = 'level';
    this.levelDiv.appendChild( this.#tileMapDiv );
  }

  updateCells() {
    for ( let index = 0, row = 0; row < this.rows; row ++ ) {
      for ( let col = 0; col < this.cols; col ++, index ++ ) {
        this.updateCellLocationAndNeighbors( this.cells[ index ], col, row );
      }
    }

    // Need locations and neighbors for all cells before we can fix paths
    this.cells.forEach( cell => {
      cell.updateTile();
      cell.updatePathfinding();
      cell.updateProp();
      cell.updateActor();
    })
  }

  updateCellLocationAndNeighbors( cell, col, row ) {
    cell.x = ( col + 0.5 ) * TileSize;
    cell.y = ( row + 0.5 ) * TileSize;
    cell.setNeighbor( 'NW', this.getCell( col - 1, row - 1 ) );
    cell.setNeighbor( 'N',  this.getCell( col    , row - 1 ) );
    cell.setNeighbor( 'NE', this.getCell( col + 1, row - 1 ) );
    cell.setNeighbor( 'W',  this.getCell( col - 1, row     ) );
    cell.setNeighbor( 'E',  this.getCell( col + 1, row     ) );
    cell.setNeighbor( 'SW', this.getCell( col - 1, row + 1 ) );
    cell.setNeighbor( 'S',  this.getCell( col    , row + 1 ) );
    cell.setNeighbor( 'SE', this.getCell( col + 1, row + 1 ) );
  }

  getCell( col, row ) {
    return 0 <= col && col < this.cols && 0 <= row && row < this.rows ? 
      this.cells[ col + row * this.cols ] : null;
  }

  // getCellAt( x, y ) {
  //   const col = Math.floor( x / TileSize );
  //   const row = Math.floor( y / TileSize );
  //   return this.cells[ col + row * this.cols ];
  // }

  changeCellKey( cell, key, layer ) {
    switch ( layer ) {
      case MapLayer.Ground:
        cell.tileInfoKey = key;
        cell.updateTile();
        break;
      case MapLayer.Props:
        cell.propInfoKey = key;
        cell.updateProp();
        break;
      case MapLayer.Actors:
        cell.actorInfoKey = key;
        cell.updateActor();
        break;
    }

    cell.passable = cell.propInfoKey ? propInfos[ cell.propInfoKey ].passable : 
      tileInfos[ cell.tileInfoKey ].passable;

    cell.updatePathfinding();
    cell.neighbors.forEach( neighbor => {
      neighbor.updateTile();
      neighbor.updatePathfinding();
    }); 
  }

  deleteCol( colIndex ) {
    this.cols --;

    for ( let row = 0, index = colIndex; row < this.rows; row ++, index += this.cols ) {
      const cell = this.cells[ index ];
      cell.cellDiv.remove();
      cell.pathsSVG.remove();
      this.cells.splice( index, 1 );
    }

    this.#tileMapDiv.style.width = this.cols * TileSize;

    this.updateCells();
  }

  deleteRow( rowIndex ) {
    this.rows --;

    const index = rowIndex * this.cols;
    for ( let col = 0; col < this.cols; col ++ ) {
      const cell = this.cells[ index ];
      cell.cellDiv.remove();
      cell.pathsSVG.remove();
      this.cells.splice( index, 1 );
    }

    this.#tileMapDiv.style.height = this.rows * TileSize;

    this.updateCells();
  }

  insertRow( rowIndex ) {
    this.rows ++;

    const insertIndex = rowIndex * this.cols;
    const newCells = Array.from( Array( this.cols ), ( _, index ) => 
      new Cell( this.cells[ insertIndex + index ].tileInfoKey )
    );

    const insertBefore = this.cells[ insertIndex ].cellDiv;

    newCells.forEach( cell => {
      insertBefore.insertAdjacentElement( 'beforebegin', cell.cellDiv );
      this.pathfindingSVG.appendChild( cell.pathsSVG );
    });

    this.cells.splice( insertIndex, 0, ...newCells );

    this.#tileMapDiv.style.height = this.rows * TileSize;

    this.updateCells();
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
}
