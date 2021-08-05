import * as Perlin from '../src/perlin.js';

const Corner = {
  NW: [ 0, 0 ],
  NE: [ 1, 0 ],
  SW: [ 0, 1 ],
  SE: [ 1, 1 ]
}

const Pattern = {
  EMPTY: (nw, ne, sw, se) => nw == 0 && ne == 0 && sw == 0 && se == 0,

  NW:    (nw, ne, sw, se) => nw == 1 && ne == 0 && sw == 0 && se == 0,
  NE:    (nw, ne, sw, se) => nw == 0 && ne == 1 && sw == 0 && se == 0,
  SW:    (nw, ne, sw, se) => nw == 0 && ne == 0 && sw == 1 && se == 0,
  SE:    (nw, ne, sw, se) => nw == 0 && ne == 0 && sw == 0 && se == 1,

  N:     (nw, ne, sw, se) => nw == 1 && ne == 1 && sw == 0 && se == 0,
  W:     (nw, ne, sw, se) => nw == 1 && ne == 0 && sw == 1 && se == 0,
  E:     (nw, ne, sw, se) => nw == 0 && ne == 1 && sw == 0 && se == 1,
  S:     (nw, ne, sw, se) => nw == 0 && ne == 0 && sw == 1 && se == 1,

  NW_SE: (nw, ne, sw, se) => nw == 1 && ne == 0 && sw == 0 && se == 1,
  NE_SW: (nw, ne, sw, se) => nw == 0 && ne == 1 && sw == 1 && se == 0,

  N_W:   (nw, ne, sw, se) => nw == 1 && ne == 1 && sw == 1 && se == 0,
  N_E:   (nw, ne, sw, se) => nw == 1 && ne == 1 && sw == 0 && se == 1,
  S_W:   (nw, ne, sw, se) => nw == 1 && ne == 0 && sw == 1 && se == 1,
  S_E:   (nw, ne, sw, se) => nw == 0 && ne == 1 && sw == 1 && se == 1,

  SOLID: (nw, ne, sw, se) => nw == 1 && ne == 1 && sw == 1 && se == 1,
}

function distance( u, v, corner ) {
  return Math.sqrt( Math.pow( corner[0] - u, 2 ) + Math.pow( corner[1] - v, 2 ) );
}

const distanceFunc = [
  { pattern: Pattern.EMPTY, func: ( u, v ) => 1 },
      
  { pattern: Pattern.NW, func: ( u, v ) => distance( u, v, Corner.NW ) },
  { pattern: Pattern.NE, func: ( u, v ) => distance( u, v, Corner.NE ) },
  { pattern: Pattern.SW, func: ( u, v ) => distance( u, v, Corner.SW ) },
  { pattern: Pattern.SE, func: ( u, v ) => distance( u, v, Corner.SE ) },

  { pattern: Pattern.N, func: ( u, v ) => v },
  { pattern: Pattern.W, func: ( u, v ) => u },
  { pattern: Pattern.E, func: ( u, v ) => 1 - u },
  { pattern: Pattern.S, func: ( u, v ) => 1 - v },

  { pattern: Pattern.NW_SE, func: ( u, v ) => Math.max( 1 - distance( u, v, Corner.NE ),
                                                        1 - distance( u, v, Corner.SW ) ) },
  { pattern: Pattern.NE_SW, func: ( u, v ) => Math.max( 1 - distance( u, v, Corner.NW ), 
                                                        1 - distance( u, v, Corner.SE ) ) },
    
  { pattern: Pattern.N_W, func: ( u, v ) => 1 - distance( u, v, Corner.SE ) },
  { pattern: Pattern.N_E, func: ( u, v ) => 1 - distance( u, v, Corner.SW ) },
  { pattern: Pattern.S_W, func: ( u, v ) => 1 - distance( u, v, Corner.NE ) },
  { pattern: Pattern.S_E, func: ( u, v ) => 1 - distance( u, v, Corner.NW ) },

  { pattern: Pattern.SOLID, func: ( u, v ) => 0 },
];


function octaveNoise(x, y, { octaves = 5, persistance = 0.5 } = {}) {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += Perlin.noise2(x * frequency, y * frequency) * amplitude;

    maxValue += amplitude;
    amplitude *= persistance;
    frequency *= 2;
  }

  return total / maxValue;
}

function drawWithFunc(ctx, startX, startY, size, distFunc) {
  const imageData = ctx.getImageData( startX, startY, size, size );
  //const pixelBuffer = new Uint32Array( imageData.data.buffer );

  let index = 0;
  for (var y = 0; y < size; y ++) {
    for (var x = 0; x < size; x ++) {
      const u = x / size;
      const v = y / size;

      // TODO: empty and full need to not be noisified
      const dist = distFunc( u, v );
      const noisey = dist + 1.0 * octaveNoise( u * 10, v * 10 );
      //const clamped = Math.min( 1.0, Math.max( 0.0, noisey ) );
      const val = Math.min( 255, Math.cos( 1.3 * noisey ) * 500 );
      
      // Also TODO: Make the noise wrap edges so these tile nicely

      // TODO: Can we make these grayscale with only one channel?
      imageData.data[ index ++ ] = val;
      imageData.data[ index ++ ] = val;
      imageData.data[ index ++ ] = val;
      imageData.data[ index ++ ] = 255;
      
      
      //pixelBuffer[index++] = val;
    }
  }

  ctx.putImageData( imageData, startX, startY );
}

export function create( size ) {
  const canvas = document.createElement( 'canvas' );
  canvas.width = size;
  canvas.height = size * 16;
  const ctx = canvas.getContext( '2d' );

  let y = 0;
  for (let nw = 0; nw < 2; nw ++) {
    for (let ne = 0; ne < 2; ne ++) {
      for (let sw = 0; sw < 2; sw ++) {
        for (let se = 0; se < 2; se ++) {
          const func = distanceFunc.find(e => e.pattern( nw, ne, sw, se )).func;
          drawWithFunc( ctx, 0, y, size, func );
          y += size;
        }
      }
    }
  }

  return canvas;
}