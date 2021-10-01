import * as Pathfinding from './pathfinding.js';

export const TileSize = 32;   // TODO: Does this make more sense as a constant somewhere else?

const tileInfos = await ( await fetch( './tileInfos.json' ) ).json();
const propInfos = await ( await fetch( './propInfos.json' ) ).json();
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
      width: ${ ( propInfo.size?.cols ?? 1 ) * TileSize }; 
      height: ${ ( propInfo.size?.rows ?? 1 ) * TileSize };
      background-position: -${ propInfo.src.col * TileSize } -${ propInfo.src.row * TileSize };
    }` );
  }
}

export class TileMap {
  // TODO: Do we want buttons with images instead?
  static getTileInfoKeys() {
    return Object.keys( tileInfos );
  }
  
  constructor( json ) {
    this.cols = json.ground.cols;
    this.rows = json.ground.rows;

    this.cells = Array.from( json.ground.tileMap, val => ( {
      tileInfoKey: json.ground.tileInfoKeys[ val ],
      propInfoKey: null,
      tileDivs: { NW: null, NE: null, SW: null, SE: null },
      propDiv: null
    } ) );

    this.#createTileDivs();

    const passableMap = this.cells.map( cell => tileInfos[ cell.tileInfoKey ].passable );

    json.props.forEach( propJson => {
      const index = propJson.col + propJson.row * this.cols;
      this.cells[ index ].propInfoKey = propJson.propInfoKey;

      this.tileMapDiv.appendChild( propFromJson( propJson ) );
      passableMap[ index ] = propInfos[ propJson.propInfoKey ].passable;
    } );

    this.nodeMap = Pathfinding.getNodeMap( {
      passableMap: passableMap,
      cols: this.cols, rows: this.rows,
      size: TileSize
    } );
    this.nodeList = this.nodeMap.filter( e => e != null );
    this.nodeMapSVG = Pathfinding.getNodeMapSVG( this.nodeMap );

    this.tileMapDiv.appendChild( this.nodeMapSVG );
  }

  #createTileDivs() {
    this.tileMapDiv = document.createElement( 'div' );
    this.tileMapDiv.className = 'tileMap';
    this.tileMapDiv.style.width = this.cols * TileSize;
    this.tileMapDiv.style.height = this.rows * TileSize;

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

        updateTileDiv( tileDiv );
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

  setTileInfoKeyAt( col, row, tileInfoKey ) {
    const index = col + row * this.cols;
    const cell = this.cells[ index ];

    if ( cell.tileInfoKey != tileInfoKey ) {
      cell.tileInfoKey = tileInfoKey;

      updateTileDiv( cell.tileDivs.NW );
      updateTileDiv( cell.tileDivs.NE );
      updateTileDiv( cell.tileDivs.SW );
      updateTileDiv( cell.tileDivs.SE );
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
    const cornersStr = tileInfos[ layerKey ].floor ? 'NW_NE_SW_SE' : 
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

function propFromJson( json ) {
  const propInfo = propInfos[ json.propInfoKey ];

  const div = document.createElement( 'div' );
  div.setAttribute( 'class', `prop ${ json.propInfoKey }` );

  const x = ( json.col - ( propInfo.offset?.cols ?? 0 ) ) * TileSize;
  const y = ( json.row - ( propInfo.offset?.rows ?? 0 ) ) * TileSize;

  const style = div.style;
  style.transform = `translate( ${ x }px, ${ y }px )`;
  style.zIndex = propInfo.passable ? 0 : ( json.row + 0.5 ) * TileSize;

  return document.body.appendChild( div );
}

