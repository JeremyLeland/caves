import { TileSize } from './tilemap.js';
import * as Pathfinding from './pathfinding.js';

const TIME_BETWEEN_FRAMES = 100;
const TIME_TO_WAIT = 3000;

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
    x: ( json.col + 0.5 ) * TileSize,
    y: ( json.row + 0.5 ) * TileSize, 
    angle: Math.PI / 2,
    life: actorInfo.life,
    speed: actorInfo.speed,
    action: 'walk',
    attack: actorInfo.attack,
    frame: 0,
    timers: { frame: 0, wait: 0 },
    spriteInfo: spriteInfos[ actorInfo.spriteInfoKey ],
    div: div
  };
}

export function updatePathSVG( actor ) {
  if ( !actor.pathSVG ) {
    actor.pathSVG = Pathfinding.getPathSVG( actor.path );
    document.body.appendChild( actor.pathSVG );
  }
  else {
    actor.pathSVG.firstChild.setAttribute( 'd', Pathfinding.getPathSVGDString( actor.path ) );
  }
}

function distanceBetween( actor, other ) {
  return Math.hypot( actor.x - other.x, actor.y - other.y );
}

export function update( { actor, others, dt } ) {
  if ( actor.timers.wait > 0 ) {
    actor.timers.wait -= dt;
  }
  else {
    // Don't try to start an attack or move if we are already attacking (or dying)
    if ( actor.action == 'idle' || actor.action == 'walk' ) {
      if ( actor.target && distanceBetween( actor, actor.target ) < TileSize ) {
        actor.action = actor.attack;
        actor.frame = 0;
      }
      else {
        // TODO: Wait a bit if we are tooClose (so we aren't twitching so much)
        const tooClose = false; /*others.some( other => {
          const cx = other.x - actor.x;
          const cy = other.y - actor.y;
          const otherInFront = 0 < cx * Math.cos( actor.angle ) + cy * Math.sin( actor.angle );
          const distToOther = Math.hypot( actor.x - other.x, actor.y - other.y );

          return otherInFront && distToOther < TileSize;
        } );*/

        if ( !tooClose ) {
          doMove( actor, dt );

          if ( actor.path?.length > 0 ) {
            actor.action = 'walk';
          }
          else {
            actor.path = null;
            actor.action = 'idle';
            actor.frame = 0;
            actor.timers.wait = actor.target ? 0 : TIME_TO_WAIT;
          }
        }
      }
    }

    updateFrame( actor, dt );
  }

  updateSprite( actor );
}

function doMove( actor, dt ) {
  let moveDist = actor.speed * dt;

  while ( moveDist > 0 && actor.path?.length > 0 ) {
    const waypoint = actor.path[ 0 ];
    const distToWaypoint = Math.hypot( waypoint.x - actor.x, waypoint.y - actor.y );

    if ( distToWaypoint < moveDist ) {
      actor.x = waypoint.x;
      actor.y = waypoint.y;
      actor.currentNode = actor.path.shift();
      updatePathSVG( actor );
    }
    else {
      actor.angle = Math.atan2( waypoint.y - actor.y, waypoint.x - actor.x );
      actor.x += Math.cos( actor.angle ) * moveDist;
      actor.y += Math.sin( actor.angle ) * moveDist;
    }

    moveDist -= distToWaypoint;
  }
}

function updateFrame( actor, dt ) {
  actor.timers.frame -= dt;

  if ( actor.timers.frame < 0 ) {
    actor.timers.frame += TIME_BETWEEN_FRAMES;

    const action = actor.spriteInfo.actions[ actor.action ];
    actor.frame = ( actor.frame + 1 ) % action.frames;

    if ( actor.frame == 0 && !action.loop ) {
      actor.action = 'idle';
    }
  }
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
  const x = Math.floor( actor.x - center.x );
  const y = Math.floor( actor.y - center.y );
  style.transform = `translate( ${ x }px, ${ y }px )`;
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