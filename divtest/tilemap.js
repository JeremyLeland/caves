export const TileSize = 32;

// TODO: Avoid top-level await so we can import just the TileSize in other places?
const tileInfos = await ( await fetch( './tileInfos.json' ) ).json();

export function prepareCSS() {
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

export function getTileMapDivs( { cols, rows, tileInfoKeys, tileMap } ) {
  const containerDiv = document.createElement( 'div' );

  for ( let row = -1; row < rows; row ++ ) {
    for ( let col = -1; col < cols; col ++ ) {
      const wCol = Math.max( 0, col ), eCol = Math.min( col + 1, cols - 1 );
      const nRow = Math.max( 0, row ), sRow = Math.min( row + 1, rows - 1 );

      const corners = {
        NW: tileInfoKeys[ tileMap[ wCol + nRow * cols ] ],
        NE: tileInfoKeys[ tileMap[ eCol + nRow * cols ] ],
        SW: tileInfoKeys[ tileMap[ wCol + sRow * cols ] ],
        SE: tileInfoKeys[ tileMap[ eCol + sRow * cols ] ],
      }

      // TODO: Save a reference for later for if we change the level?
      new Set( Object.values( corners ) ).forEach( layerKey => {
        const cornersStr = Object.keys( corners ).filter( 
          key => corners[ key ] == layerKey
        ).join( '_' );

        const div = document.createElement( 'div' );
        div.setAttribute( 'class', `tile ${ layerKey } ${ cornersStr }` );
        div.style.transform = `translate( ${ col * 100 + 50 }%, ${ row * 100 + 50 }% )`;
        containerDiv.appendChild( div );
      });
    }
  }

  document.body.appendChild( containerDiv );
}
