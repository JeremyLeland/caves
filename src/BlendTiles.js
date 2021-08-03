export function create( size ) {
  const ONE_CORNER   = [ size * 0, 0    ];
  const THREE_CORNER = [ size * 2, 0    ];
  const TWO_CORNER   = [ size * 4, 0    ];
  const HORIZONTAL   = [ size * 5, 0    ];
  const VERTICAL     = [ size * 6, 0    ];
  const SOLID        = [ size * 6, size ];
  
  //
  // Source
  //

  const src = document.createElement( 'canvas' );
  src.width = size * 8;
  src.height = size * 2;
  const ctx = src.getContext( '2d' );

  const STOP_DIST = 0.3, STOP_1 = STOP_DIST, STOP_2 = 1 - STOP_DIST;

  let x, y, cx, cy, gradient;

  // one corner
  [ x, y ] = ONE_CORNER;
  cx = x + size; cy = y + size;
  gradient = ctx.createRadialGradient( cx, cy, 0, cx, cy, size );
  gradient.addColorStop( STOP_1, 'white' );
  gradient.addColorStop( STOP_2, 'black' );
  ctx.fillStyle = gradient;
  ctx.fillRect( x, y, size * 2, size * 2 );

  // three corners
  [ x, y ] = THREE_CORNER;
  cx = x + size; cy = y + size;
  gradient = ctx.createRadialGradient( cx, cy, 0, cx, cy, size );
  gradient.addColorStop( STOP_1, 'black' );
  gradient.addColorStop( STOP_2, 'white' );
  ctx.fillStyle = gradient;
  ctx.fillRect( x, y, size * 2, size * 2 );

  // two corners
  [ x, y ] = TWO_CORNER;
  cx = x + size; cy = y;
  gradient = ctx.createRadialGradient( cx, cy, 0, cx, cy, size );
  gradient.addColorStop( STOP_1, 'white' );
  gradient.addColorStop( STOP_2, 'black' );
  ctx.fillStyle = gradient;
  ctx.fillRect( x, y, size, size );

  cx = x + size; cy = y + size * 2;
  gradient = ctx.createRadialGradient( cx, cy, 0, cx, cy, size );
  gradient.addColorStop( STOP_1, 'white' );
  gradient.addColorStop( STOP_2, 'black' );
  ctx.fillStyle = gradient;
  ctx.fillRect( x, y + size, size, size );

  cx = x; cy = y + size;
  gradient = ctx.createRadialGradient( cx, cy, 0, cx, cy, size );
  gradient.addColorStop( STOP_1, 'white' );
  gradient.addColorStop( STOP_2, 'black' );
  ctx.fillStyle = gradient;
  ctx.globalCompositeOperation = 'lighten';
  ctx.fillRect( x, y, size, size * 2 );
  ctx.globalCompositeOperation = 'source-over';
  
  // horizontal sides
  [ x, y ] = HORIZONTAL;
  gradient = ctx.createLinearGradient( x, y, x, y + size * 2 );
  gradient.addColorStop( STOP_1 / 2, 'black' );
  gradient.addColorStop( STOP_2 / 2, 'white' );
  gradient.addColorStop( 1 - (STOP_2 / 2), 'white' );
  gradient.addColorStop( 1 - (STOP_1 / 2), 'black' );
  ctx.fillStyle = gradient;
  ctx.fillRect( x, y, size, size * 2 );

  // vertical sides
  [ x, y ] = VERTICAL;
  gradient = ctx.createLinearGradient( x, y, x + size * 2, y );
  gradient.addColorStop( STOP_1 / 2, 'black' );
  gradient.addColorStop( STOP_2 / 2, 'white' );
  gradient.addColorStop( 1 - (STOP_2 / 2), 'white' );
  gradient.addColorStop( 1 - (STOP_1 / 2), 'black' );
  ctx.fillStyle = gradient;
  ctx.fillRect( x, y, size * 2, size );

  // solids
  [ x, y ] = SOLID;
  ctx.fillStyle = 'black';
  ctx.fillRect( x, y, size, size );
  ctx.fillStyle = 'white';
  ctx.fillRect( x + size, y, size, size );


  //
  // Atlas
  //

  const coords = [
    // NW: 0, NE: 0, SW: 0, SE: 0
    [ SOLID[0], SOLID[1] ],
    
    // NW: 0, NE: 0, SW: 0, SE: 1
    [ ONE_CORNER[0], ONE_CORNER[1] ],

    // NW: 0, NE: 0, SW: 1, SE: 0
    [ ONE_CORNER[0] + size, ONE_CORNER[1] ],

    // NW: 0, NE: 0, SW: 1, SE: 1
    [ HORIZONTAL[0], HORIZONTAL[1] ],

    // NW: 0, NE: 1, SW: 0, SE: 0
    [ ONE_CORNER[0], ONE_CORNER[1] + size ],

    // NW: 0, NE: 1, SW: 0, SE: 1
    [ VERTICAL[0], VERTICAL[1] ],

    // NW: 0, NE: 1, SW: 1, SE: 0
    [ TWO_CORNER[0], TWO_CORNER[1] ],

    // NW: 0, NE: 1, SW: 1, SE: 1
    [ THREE_CORNER[0] + size, THREE_CORNER[1] + size ],

    // NW: 1, NE: 0, SW: 0, SE: 0
    [ ONE_CORNER[0] + size, ONE_CORNER[1] + size ],

    // NW: 1, NE: 0, SW: 0, SE: 1
    [ TWO_CORNER[0], TWO_CORNER[1] + size ],

    // NW: 1, NE: 0, SW: 1, SE: 0
    [ VERTICAL[0] + size, VERTICAL[1] ],

    // NW: 1, NE: 0, SW: 1, SE: 1
    [ THREE_CORNER[0], THREE_CORNER[1] + size ],

    // NW: 1, NE: 1, SW: 0, SE: 0
    [ HORIZONTAL[0], HORIZONTAL[1] + size ],

    // NW: 1, NE: 1, SW: 0, SE: 1
    [ THREE_CORNER[0] + size, THREE_CORNER[1] ],

    // NW: 1, NE: 1, SW: 1, SE: 0
    [ THREE_CORNER[0], THREE_CORNER[1] ],

    // NW: 1, NE: 1, SW: 1, SE: 1
    [ SOLID[0] + size, SOLID[1] ],
  ];

  const atlas = document.createElement('canvas');
  atlas.width = size;
  atlas.height = size * 16;
  const atlasCtx = atlas.getContext( '2d' );

  let dy = 0;
  coords.forEach(cord => {
    atlasCtx.drawImage( src, cord[0], cord[1], size, size, 0, dy, size, size );
    dy += size;
  });
  
  return atlas;
}