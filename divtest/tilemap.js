export const TileSize = 32;   // TODO: Does this make more sense as a constant somewhere else?

const tileInfos = await ( await fetch( './tileInfos.json' ) ).json();
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
}

export class TileMap {
  constructor( json ) {
    this.cols = json.cols;
    this.rows = json.rows;

    this.cells = Array.from( json.tileMap, val => ( {
      tileInfoKey: json.tileInfoKeys[ val ],
      tileDivs: {}
    } ) )

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

        tileDiv.corners.NW = nwCell;
        tileDiv.corners.NE = neCell;
        tileDiv.corners.SW = swCell;
        tileDiv.corners.SE = seCell;

        nwCell.tileDivs.SE = tileDiv;
        neCell.tileDivs.SW = tileDiv;
        swCell.tileDivs.NE = tileDiv;
        seCell.tileDivs.NW = tileDiv;     

        updateTileDiv( tileDiv );
      }
    }

    document.body.appendChild( this.tileMapDiv );
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

  #createTileDiv( col, row ) {
    const div = document.createElement( 'div' );
    div.className = 'tile';
    div.style.transform = `translate( ${ col * 100 + 50 }%, ${ row * 100 + 50 }% )`;

    div.corners = {};

    this.tileMapDiv.appendChild( div );

    return div;
  }

  getPassableMap() {
    return this.cells.map( cell => tileInfos[ cell.tileInfoKey ].passable );
  }
}


function updateTileDiv( tileDiv ) {
  const corners = {
    NW: tileDiv.corners.NW.tileInfoKey,
    NE: tileDiv.corners.NE.tileInfoKey,
    SW: tileDiv.corners.SW.tileInfoKey,
    SE: tileDiv.corners.SE.tileInfoKey,
  };

  const frag = new DocumentFragment();

  new Set( Object.values( corners ) ).forEach( layerKey => {
    const cornersStr = Object.keys( corners ).filter( 
      key => corners[ key ] == layerKey
    ).join( '_' );

    const div = document.createElement( 'div' );
    div.className = `layer ${ layerKey } ${ cornersStr }`;
    frag.appendChild( div );
  } );

  tileDiv.innerHTML = '';
  tileDiv.appendChild( frag );
}

// function getCornerString( { nw, ne, sw, se } ) {
//   //return `NW${ nw }_NE${ ne }_SW${ sw }_SE${ se }`;
//   const cornersStr = tileInfo.floor ? 'NW_NE_SW_SE' :   // floor layer should always be full tile
//   Object.keys( corners ).filter( 
//     key => corners[ key ] == layerKey
//   ).join( '_' );
// }

