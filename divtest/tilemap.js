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
      '',       'NW_NE_SW',     'NW_NE_SE',
      '',       'NW_SW_SE',     'NE_SW_SE',
      'SE',     'SW_SE',        'SW',
      'NE_SE',  'NW_NE_SW_SE',  'NW_SW',
      'NE',     'NW_NE',        'NW',
      'var1',   'var2',         'var3',
      'NE_SW',  'NW_SE',        ''
    ]
  };

  for ( let index = 0, row = 0; row < template.rows; row ++ ) {
    for ( let col = 0; col < template.cols; col ++, index ++ ) {
      const corners = template.layout[ index ];
      if ( corners != '' ) {
        styleSheet.insertRule( `.${ corners } { 
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

export class TileMap {
  constructor( json ) {
    this.cols = json.ground.cols;
    this.rows = json.ground.rows;

    this.cells = [];
    
    for ( let index = 0, row = 0; row < this.rows; row ++ ) {
      for ( let col = 0; col < this.cols; col ++, index ++ ) {
        this.cells[ index ] = {
          col: col,
          row: row,
          tileInfoKey: null,
          propInfoKey: null,
          actorInfoKey: null,
          pathfindingNode: null,
          tileDivs: { NW: null, NE: null, SW: null, SE: null },
          propDiv: null,
          actor: null,
        }
      }
    }
    
    this.tileMapDiv = document.createElement( 'div' );
    this.tileMapDiv.className = 'tileMap';
    this.tileMapDiv.style.width = this.cols * TileSize;
    this.tileMapDiv.style.height = this.rows * TileSize;

    const grid = document.createElement( 'div' );
    grid.className = 'grid';
    this.tileMapDiv.appendChild( grid );

    this.#createTileDivs();

    const SVG_URI = 'http://www.w3.org/2000/svg';
    this.pathfindingSVG = document.createElementNS( SVG_URI, 'svg' );
    this.pathfindingSVG.setAttribute( 'class', 'pathfinding nodeMap' );

    json.ground.tileMap.forEach( ( keyIndex, index ) => {
      this.setKeyForCell( 
        this.cells[ index ], json.ground.tileInfoKeys[ keyIndex ], MapLayer.Ground
      );
    })

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

    this.cells.forEach( cell => {
      if ( this.#isPassable( cell ) ) {
        this.#addPathfindingNode( cell.col, cell.row );
      }
    });

    this.tileMapDiv.appendChild( this.pathfindingSVG );
  }

  #createTileDivs() {
    for ( let row = -1; row < this.rows; row ++ ) {
      for ( let col = -1; col < this.cols; col ++ ) {
        const wCol = Math.max( 0, col ), eCol = Math.min( col + 1, this.cols - 1 );
        const nRow = Math.max( 0, row ), sRow = Math.min( row + 1, this.rows - 1 );

        const nwCell = this.cells[ wCol + nRow * this.cols ];
        const neCell = this.cells[ eCol + nRow * this.cols ];
        const swCell = this.cells[ wCol + sRow * this.cols ];
        const seCell = this.cells[ eCol + sRow * this.cols ];

        const tileDiv = this.#createTileDiv( col, row );

        // Every tile will be controled by 4 corner cells, 
        // but they might point to the same cell (i.e. on the edges of the map)
        tileDiv.cornerCells.NW = nwCell;
        tileDiv.cornerCells.NE = neCell;
        tileDiv.cornerCells.SW = swCell;
        tileDiv.cornerCells.SE = seCell;

        // This tilediv may not apply to all cells chosen
        nwCell.tileDivs.SE = tileDiv;
        if ( col < this.cols - 1 )  neCell.tileDivs.SW = tileDiv;
        if ( row < this.rows - 1 )  swCell.tileDivs.NE = tileDiv;
        if ( col < this.cols - 1  && row < this.rows - 1 )  seCell.tileDivs.NW = tileDiv;
      }
    }
  }

  #createTileDiv( col, row ) {
    const div = document.createElement( 'div' );
    div.className = 'tile';
    div.style.transform = `translate( ${ col * 100 + 50 }%, ${ row * 100 + 50 }% )`;

    div.cornerCells = {};

    this.tileMapDiv.appendChild( div );

    return div;
  }

  #isPassable( cell ) {
    return cell.propInfoKey ? propInfos[ cell.propInfoKey ].passable : 
      tileInfos[ cell.tileInfoKey ].passable;
  }

  #addPathfindingNode( col, row ) {
    const index = col + row * this.cols;
    const cell = this.cells[ index ];
    cell.pathfindingNode = new PathfindingNode( ( col + 0.5 ) * TileSize, ( row + 0.5 ) * TileSize );
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

          updateTileDiv( cell.tileDivs.NW );
          updateTileDiv( cell.tileDivs.NE );
          updateTileDiv( cell.tileDivs.SW );
          updateTileDiv( cell.tileDivs.SE );

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

    if ( needUpdatePathfinding ) {
      const passable = this.#isPassable( cell );
      if ( passable && !cell.pathfindingNode ) {
        this.#addPathfindingNode( cell.col, cell.row );
      }
      else if ( !passable && cell.pathfindingNode ) {
        this.#removePathfindingNode( cell.col, cell.row );
      }
    }
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
        if ( !propIndices[ cell.propInfoKey ] ) {
          propIndices[ cell.propInfoKey ] = [];
        }
        propIndices[ cell.propInfoKey ].push( index );
      }

      if ( cell.actorInfoKey ) {
        if ( !actorIndices[ cell.actorInfoKey ] ) {
          actorIndices[ cell.actorInfoKey ] = [];
        }
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

  updateCellProp( cell ) {
    if ( cell.propInfoKey ) {
      if ( !cell.propDiv ) {
        cell.propDiv = document.createElement( 'div' );
        this.tileMapDiv.appendChild( cell.propDiv );
      }

      cell.propDiv.className = `prop ${ cell.propInfoKey }`;

      const style = cell.propDiv.style;

      const x = cell.col * TileSize;
      const y = cell.row * TileSize;
      style.transform = `translate( ${ x }px, ${ y }px )`;

      const propInfo = propInfos[ cell.propInfoKey ];
      style.zIndex = propInfo.passable ? 0 : ( cell.row + 0.5 ) * TileSize;

    }
    else if ( cell.propDiv ) {
      this.tileMapDiv.removeChild( cell.propDiv );
      cell.propDiv = null;
    }
  }

  updateCellActor( cell ) {
    if ( cell.actor ) {
      this.tileMapDiv.removeChild( cell.actor.spriteDiv );
    }

    if ( cell.actorInfoKey ) {
      cell.actor = new Actor(
        cell.actorInfoKey,
        ( cell.col + 0.5 ) * TileSize,
        ( cell.row + 0.5 ) * TileSize
      );
      this.tileMapDiv.appendChild( cell.actor.spriteDiv );
    }
    else {
      cell.actor = null;
    }
  }
}

function updateTileDiv( tileDiv ) {
  const corners = {
    NW: tileDiv.cornerCells.NW.tileInfoKey,
    NE: tileDiv.cornerCells.NE.tileInfoKey,
    SW: tileDiv.cornerCells.SW.tileInfoKey,
    SE: tileDiv.cornerCells.SE.tileInfoKey,
  };

  const frag = new DocumentFragment();

  new Set( Object.values( corners ) ).forEach( layerKey => {
    const cornersStr = tileInfos[ layerKey ]?.floor ? 'NW_NE_SW_SE' : 
      Object.keys( corners ).filter( 
        key => corners[ key ] == layerKey
      ).join( '_' );

    const div = document.createElement( 'div' );
    div.className = `layer ${ layerKey } ${ cornersStr }`;
    frag.appendChild( div );
  } );

  tileDiv.innerHTML = '';
  tileDiv.appendChild( frag );
}

function linkCells( a, b ) {
  PathfindingNode.linkNodes( a.pathfindingNode, b.pathfindingNode );
}