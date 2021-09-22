import { TileSize } from './tilemap.js';

const TIME_BETWEEN_FRAMES = 100;

const spriteInfos = await ( await fetch( './spriteInfos.json' ) ).json();
const actorInfos  = await ( await fetch( './actorInfos.json'  ) ).json();

export function prepareCSS() {
  const styleSheet = document.styleSheets[ 0 ];

  for ( let spriteInfoKey in spriteInfos ) {
    const spriteInfo = spriteInfos[ spriteInfoKey ];
    styleSheet.insertRule( `.${ spriteInfoKey } { 
      width: ${ spriteInfo.width }; 
      height: ${ spriteInfo.height };
    }` );
  }

  for ( let actorInfoKey in actorInfos ) {
    const actorInfo = actorInfos[ actorInfoKey ];
    actorInfo.layers.forEach( layer => {
      styleSheet.insertRule( `.${ actorInfo.spriteInfoKey } > .${ layer } {
        background-image: url( ${ actorInfo.imagesPath }/${ layer }.png );
      }` );
    } );
  }
}

export function fromJson( json ) {
  const actorInfo = actorInfos[ json.actorInfoKey ];

  const div = document.createElement( 'div' );
  div.setAttribute( 'class', `actor ${ actorInfo.spriteInfoKey }` );
  document.body.appendChild( div );

  actorInfo.layers.forEach ( layer => {
    const layerDiv = document.createElement( 'div' );
    layerDiv.setAttribute( 'class', `layer ${ layer }` );
    div.appendChild( layerDiv );
  });

  return {
    x: json.col * TileSize,
    y: json.row * TileSize, 
    angle: Math.PI / 2,
    life: actorInfo.life,
    speed: actorInfo.speed,
    action: 'walk',
    frame: 0,
    timers: { frame: 0, wait: 0 },
    spriteInfo: spriteInfos[ actorInfo.spriteInfoKey ],
    div: div
  };
}

export function update( { actor, others, dt } ) {
  for ( let t in actor.timers ) {
    actor.timers[ t ] -= dt;
  }


  // Wait if we are tooClose (don't set back to idle)

  const tooClose = others.some( other => {
    const cx = other.x - actor.x;
    const cy = other.y - actor.y;
    const otherInFront = 0 < cx * Math.cos( actor.angle ) + cy * Math.sin( actor.angle );
    const distToOther = Math.hypot( actor.x - other.x, actor.y - other.y );

    return otherInFront && distToOther < 50;
  } );

  if ( tooClose ) {
    actor.action = 'idle';
    actor.frame = 0;
  }
  else {
    actor.action = 'walk';
    updateLocation( actor, dt );
  }

  // Frame updates
  if ( actor.timers.frame < 0 ) {
    actor.timers.frame += TIME_BETWEEN_FRAMES;

    const action = actor.spriteInfo.actions[ actor.action ];
    actor.frame = ( actor.frame + 1 ) % action.frames;

    if ( actor.frame == 0 && !action.loop ) {
      actor.action = 'idle';
    }
  }

  updateSprite( actor );
}

function updateLocation( actor, dt ) {
  const moveDist = actor.speed * dt;
  actor.x += Math.cos( actor.angle ) * moveDist;
  actor.y += Math.sin( actor.angle ) * moveDist;
}

function updateSprite( actor ) {
  const spriteInfo = actor.spriteInfo;

  const dir = actor.action == 'die' ? 'south' : directionFromAngle( actor.angle );

  const action = spriteInfo.actions[ actor.action ];

  const center = spriteInfo.centers ? spriteInfo.centers[ dir ] : spriteInfo.center;
  const col = action.col + actor.frame;

  const dirIndex = spriteInfo.dirIndex[ dir ];
  const row = action.row + dirIndex;

  const style = actor.div.style;
  style.left = actor.x - center.x;
  style.top = actor.y - center.y;
  style.zIndex = Math.floor( actor.y );
  style.backgroundPosition = `-${ col * 100 }% -${ row * 100 }%`;
}

function directionFromAngle( angle ) {
  if ( angle < ( -3 / 4 ) * Math.PI )   return 'west';
  if ( angle < ( -1 / 4 ) * Math.PI )   return 'north';
  if ( angle < (  1 / 4 ) * Math.PI )   return 'east';
  if ( angle < (  3 / 4 ) * Math.PI )   return 'south';

  return 'west';
}