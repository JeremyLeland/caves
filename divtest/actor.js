export function fromJson( { json, actorInfos, spriteInfos } ) {
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
    x: json.x,
    y: json.y, 
    angle: Math.PI / 2,
    life: actorInfo.life,
    speed: actorInfo.speed,
    action: 'walk',
    frame: 0,
    spriteInfo: spriteInfos[ actorInfo.spriteInfoKey ],
    div: div
  };
}

export function update( { actor, others, dt } ) {
  const tooClose = others.some( other => {
    const cx = other.x - actor.x;
    const cy = other.y - actor.y;
    const otherInFront = 0 < cx * Math.cos( actor.angle ) + cy * Math.sin( actor.angle );
    const distToOther = Math.hypot( actor.x - other.x, actor.y - other.y );

    return otherInFront && distToOther < 50;
  } );

  if ( tooClose ) {
    actor.action = 'idle';
  }
  else {
    actor.action = 'walk';
    updateLocation( actor, dt );
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
  const x = ( action.col + actor.frame ) * spriteInfo.width;

  const dirIndex = spriteInfo.dirIndex[ dir ];
  const y = ( action.row + dirIndex ) * spriteInfo.height;

  const style = actor.div.style;
  style.left = actor.x - center.x;
  style.top = actor.y - center.y;
  style.zIndex = Math.floor( actor.y );
  style.backgroundPosition = `-${ x } -${ y }`;
}

function directionFromAngle( angle ) {
  if ( angle < ( -3 / 4 ) * Math.PI )   return 'west';
  if ( angle < ( -1 / 4 ) * Math.PI )   return 'north';
  if ( angle < (  1 / 4 ) * Math.PI )   return 'east';
  if ( angle < (  3 / 4 ) * Math.PI )   return 'south';

  return 'west';
}