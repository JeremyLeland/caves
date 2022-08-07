export const TileSize = 32;

export const TileInfo = {
  dirt:  { src: '../images/terrain/dirt.png',   passable: true  },
  sand:  { src: '../images/terrain/sand.png',   passable: true  },
  path:  { src: '../images/terrain/path.png',   passable: true  },
  water: { src: '../images/terrain/water.png',  passable: false },
  hole:  { src: '../images/terrain/hole.png',   passable: false },
  empty: { src: '../images/terrain/empty.png',  passable: false },
  grass: { src: '../images/terrain/grass.png',  passable: true  },
  snow:  { src: '../images/terrain/snow.png',   passable: true  }
}

const template = [
  [ '',      'NW+NE+SW',    'NW+NE+SE', ],
  [ '',      'NW+SW+SE',    'NE+SW+SE', ],
  [ 'SE',    'SW+SE',       'SW',       ],
  [ 'NE+SE', 'NW+NE+SW+SE', 'NW+SW',    ],
  [ 'NE',    'NW+NE',       'NW',       ],
  [ 'var1',  'var2',        'var3',     ],
  [ 'NE+SW', 'NW+SE',       ''          ],
];

const coords = [[[[[ ]],[[ ]]],[[[ ]],[[ ]]]],[[[[ ]],[[ ]]],[[[ ]],[[ ]]]]];

for ( let row = 0; row < template.length; row ++ ) {
  for ( let col = 0; col < template[ 0 ].length; col ++ ) {
    const [ nw, ne, sw, se ] = [ 'NW', 'NE', 'SW', 'SE' ].map( 
      e => template[ row ][ col ].includes( e ) ? 1 : 0 
    );

    coords[ nw ][ ne ][ sw ][ se ] = { x: col * TileSize, y: row * TileSize };
  }
}
coords[ 0 ][ 0 ][ 0 ][ 0 ] = null;  // don't draw if empty

export async function drawTileMap( tileInfoKeys, tileMap, ctx ) {
  const tileImages = Array.from( tileInfoKeys, tileInfoKey => {
    const image = new Image();
    image.src = TileInfo[ tileInfoKey ].src;      
    return image;
  } );
  
  await Promise.all( tileImages.map( image => image.decode() ) );

  for ( let row = -1; row < tileMap.length; row ++ ) {
    for ( let col = -1; col < tileMap[ 0 ].length; col ++ ) {
      const wCol = Math.max( 0, col ); 
      const nRow = Math.max( 0, row );
      const eCol = Math.min( col + 1, tileMap[ 0 ].length - 1 );
      const sRow = Math.min( row + 1, tileMap.length - 1 );
  
      const nw = tileMap[ nRow ][ wCol ];
      const ne = tileMap[ nRow ][ eCol ];
      const sw = tileMap[ sRow ][ wCol ];
      const se = tileMap[ sRow ][ eCol ];
  
      tileImages.forEach( ( image, index ) => {
        const [ isNW, isNE, isSW, isSE ] = [ nw, ne, sw, se ].map( 
          e => e == index ? 1 : 0 
        );
        const coord = coords[ isNW ][ isNE ][ isSW ][ isSE ];
  
        if ( coord ) {
          ctx.drawImage( image, 
            coord.x, coord.y, TileSize, TileSize, 
            ( 0.5 + col ) * TileSize, ( 0.5 + row ) * TileSize, TileSize, TileSize
          );
        }
      } );
    }
  }
}