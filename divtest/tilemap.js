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
    styleSheet.insertRule( `.${ tileInfoKey } {
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
      margin-left: ${ ( -0.5 - ( propInfo.offset?.cols ?? 0 ) ) * TileSize };
      margin-top:  ${ ( -0.5 - ( propInfo.offset?.rows ?? 0 ) ) * TileSize };
      background-position: -${ propInfo.src.col * TileSize } -${ propInfo.src.row * TileSize };
    }` );
  }
}

export class TileMap {
  #tileMapDiv;

  constructor( json ) {
    this.cols = json.ground.cols;
    this.rows = json.ground.rows;

    this.cells = Array.from( json.ground.tileMap, tileInfoIndex => ( {
      x: 0, y: 0,
      neighbors: {
        NW: null, N: null, NE: null,
         W: null,           E: null,
        SW: null, S: null, SE: null
      },
      tileInfoKey: json.ground.tileInfoKeys[ tileInfoIndex ],
      propInfoKey: null,
      actorInfoKey: null,
      cellDiv: createCellDiv(),
      propDiv: null,
      actor: null,
    } ) );

    this.#tileMapDiv = document.createElement( 'div' );
    this.#tileMapDiv.className = 'tileMap';
    this.#tileMapDiv.style.width = this.cols * TileSize;
    this.#tileMapDiv.style.height = this.rows * TileSize;

    const grid = document.createElement( 'div' );
    grid.className = 'grid';
    this.#tileMapDiv.appendChild( grid );
    
    for ( let index = 0, row = 0; row < this.rows; row ++ ) {
      for ( let col = 0; col < this.cols; col ++, index ++ ) {
        const cell = this.cells[ index ];

        cell.neighbors.NW = this.getCell( col - 1, row - 1 );
        cell.neighbors.N  = this.getCell( col    , row - 1 );
        cell.neighbors.NE = this.getCell( col + 1, row - 1 );
        cell.neighbors.W  = this.getCell( col - 1, row     );
        cell.neighbors.E  = this.getCell( col + 1, row     );
        cell.neighbors.SW = this.getCell( col - 1, row + 1 );
        cell.neighbors.S  = this.getCell( col    , row + 1 );
        cell.neighbors.SE = this.getCell( col + 1, row + 1 );

        this.updateCellTile( cell );

        cell.x = ( col + 0.5 ) * TileSize;
        cell.y = ( row + 0.5 ) * TileSize;

        this.#tileMapDiv.appendChild( cell.cellDiv );
      }
    }
    

    const SVG_URI = 'http://www.w3.org/2000/svg';
    this.pathfindingSVG = document.createElementNS( SVG_URI, 'svg' );
    this.pathfindingSVG.setAttribute( 'class', 'pathfinding nodeMap' );

    // json.ground.tileMap.forEach( ( keyIndex, index ) => {
    //   this.setKeyForCell( 
    //     this.cells[ index ], json.ground.tileInfoKeys[ keyIndex ], MapLayer.Ground
    //   );
    // })


    // this.cells.forEach( cell => {
    //   if ( this.#isPassable( cell ) ) {
    //     this.#addPathfindingNode( cell.col, cell.row );
    //   }
    // });

    this.#tileMapDiv.appendChild( this.pathfindingSVG );

    this.levelDiv = document.createElement( 'div' );
    this.levelDiv.className = 'level';
    this.levelDiv.appendChild( this.#tileMapDiv );

    for ( let propInfoKey in json.props ) {
      json.props[ propInfoKey ].forEach( index => {
        this.setKeyForCell( this.cells[ index ], propInfoKey, MapLayer.Props );
      });
    }

    for ( let actorInfoKey in json.actors ) {
      json.actors[ actorInfoKey ].forEach( index => {
        this.setKeyForCell( this.cells[ index ], actorInfoKey, MapLayer.Actors );
      });
    }
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

    // if ( needUpdatePathfinding ) {
    //   const passable = this.#isPassable( cell );
    //   if ( passable && !cell.pathfindingNode ) {
    //     this.#addPathfindingNode( cell.col, cell.row );
    //   }
    //   else if ( !passable && cell.pathfindingNode ) {
    //     this.#removePathfindingNode( cell.col, cell.row );
    //   }
    // }
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

    const tileClassNameCompare = {
      'tileNW': { 'NW': 'NW', 'NE': 'N' , 'SW': 'W'  },
      'tileNE': { 'NW': 'N' , 'NE': 'NE', 'SE': 'E'  },
      'tileSW': { 'NW': 'W' , 'SW': 'SW', 'SE': 'S'  },
      'tileSE': { 'NE': 'E' , 'SW': 'S' , 'SE': 'SE' },
    };

    for ( const [ tile, classNameCompare ] of Object.entries( tileClassNameCompare ) ) {
      const tileClassList = cell.cellDiv[ tile ].classList;
      for ( const [ className, compare ] of Object.entries( classNameCompare ) ) {
        const neighbor = cell.neighbors[ compare ]?.tileInfoKey ?? cell.tileInfoKey;
        tileClassList.toggle( className, neighbor == cell.tileInfoKey || floor );
      }
    }

    // cellDiv.tileNW.classList.toggle( 'NW', nw == us || floor );
    // cellDiv.tileNW.classList.toggle( 'NE', n  == us || floor );
    // cellDiv.tileNW.classList.toggle( 'SW', w  == us || floor );

    // cellDiv.tileNE.classList.toggle( 'NW', n  == us || floor );
    // cellDiv.tileNE.classList.toggle( 'NE', ne == us || floor );
    // cellDiv.tileNE.classList.toggle( 'SE', e  == us || floor );

    // cellDiv.tileSW.classList.toggle( 'NW', w  == us || floor );
    // cellDiv.tileSW.classList.toggle( 'SW', sw == us || floor );
    // cellDiv.tileSW.classList.toggle( 'SE', s  == us || floor );

    // cellDiv.tileSE.classList.toggle( 'NE', e  == us || floor );
    // cellDiv.tileSE.classList.toggle( 'SW', s  == us || floor );
    // cellDiv.tileSE.classList.toggle( 'SE', se == us || floor );
  }

  updateCellPathfinding( cell ) {

  }

  updateCellProp( cell ) {
    if ( cell.propInfoKey ) {
      if ( !cell.propDiv ) {
        cell.propDiv = document.createElement( 'div' );
        this.levelDiv.appendChild( cell.propDiv );
      }

      cell.propDiv.className = `prop ${ cell.propInfoKey }`;

      const style = cell.propDiv.style;
      style.transform = `translate( ${ cell.x }px, ${ cell.y }px )`;
      style.zIndex = propInfos[ cell.propInfoKey ].passable ? 0 : cell.y;
    }
    else if ( cell.propDiv ) {
      this.levelDiv.removeChild( cell.propDiv );
      cell.propDiv = null;
    }
  }

  updateCellActor( cell ) {
    if ( cell.actor ) {
      this.levelDiv.removeChild( cell.actor.spriteDiv );
    }

    if ( cell.actorInfoKey ) {
      cell.actor = new Actor( cell.actorInfoKey, cell.x, cell.y );
      this.levelDiv.appendChild( cell.actor.spriteDiv );
    }
    else {
      cell.actor = null;
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