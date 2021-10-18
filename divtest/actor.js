import * as Pathfinding from './pathfinding.js';

// TODO: Move these to json somewhere?
const TIME_TO_WAIT = 3000;
const TIME_TO_WANDER = 3000;
const TIME_BETWEEN_ATTACKS = 1000;
const TARGET_RANGE = 100;

const State = { Waiting: 0, Wandering: 1, OnTarget: 2 };

// TODO: Do these as part of init() and do them in parallel?
export const spriteInfos = await ( await fetch( './spriteInfos.json' ) ).json();
export const actorInfos  = await ( await fetch( './actorInfos.json'  ) ).json();
prepareCSS();

function prepareCSS() {
  const styleSheet = document.styleSheets[ 0 ];

  for ( let spriteInfoKey in spriteInfos ) {
    const spriteInfo = spriteInfos[ spriteInfoKey ];
    styleSheet.insertRule( `.${ spriteInfoKey } { 
      width: ${ spriteInfo.width }; 
      height: ${ spriteInfo.height };
    }` );

    for ( let actionInfoKey in spriteInfo[ 'actions' ] ) {
      const actionInfo = spriteInfo[ 'actions' ][ actionInfoKey ];

      styleSheet.insertRule( `.${ spriteInfoKey } > .${ actionInfoKey } {
        animation-name: ${ spriteInfoKey }_${ actionInfoKey };
        animation-duration: ${ actionInfo.duration }s;
        animation-timing-function: steps( ${ actionInfo.frames } );
        animation-iteration-count: ${ actionInfo.loop ? 'infinite' : '1' };
        ${ actionInfo.final ? 'animation-fill-mode: forwards;' : '' };
        left: -${ actionInfo.col * spriteInfo.width };
        top:  -${ actionInfo.row * spriteInfo.height };
      }` );
      
      styleSheet.insertRule( `@keyframes ${ spriteInfoKey }_${ actionInfoKey } {
        to { left: -${ ( actionInfo.col + actionInfo.frames ) * spriteInfo.width }; }
      }` );
    }
  }
}


export class Actor {
  constructor( actorInfoKey, homeCell ) {
    this.actorInfoKey = actorInfoKey;
    this.currentCell = homeCell;
    this.homeCell = homeCell;
    this.x = homeCell.x;
    this.y = homeCell.y;

    const actorInfo = actorInfos[ actorInfoKey ];

    const spriteDiv = document.createElement( 'div' );
    spriteDiv.className= `sprite ${ actorInfo.spriteInfoKey }`;

    const animDiv = document.createElement( 'div' );
    actorInfo.layers.forEach ( layer => {
      const layerImg = document.createElement( 'img' );
      layerImg.className = 'layer';
      layerImg.src = `${ actorInfo.imagesPath }/${ layer }.png`
      animDiv.appendChild( layerImg );
    });

    spriteDiv.appendChild( animDiv );

    this.angle = Math.PI / 2;
    this.life = actorInfo.life;
    this.maxLife = actorInfo.life;
    this.speed = actorInfo.speed;
    this.attack = actorInfo.attack;
    this.timers = { wait: 0, wander: 0, attack: 0 };    // TODO: Map instead of object, for easier iteration?
    this.spriteInfo = spriteInfos[ actorInfo.spriteInfoKey ];
    this.spriteDiv = spriteDiv;
    this.animationDiv = animDiv;

    // TODO: Add to this to the same layer as the rest of pathfinding?
    // Use a custom style to make it look different (random color per actor?)
    const SVG_URI = 'http://www.w3.org/2000/svg';
    this.pathSVG = document.createElementNS( SVG_URI, 'path' );
    this.pathSVG.style.stroke = 'black';

    this.healthBar = document.createElement( 'div' );
    this.healthBar.className = 'healthBar';
    this.#updateHealthBar();
    this.spriteDiv.appendChild( this.healthBar );

    this.state = State.Wandering;
    this.#updateSprite();
  }

  setGoalCell( goalCell ) {
    if ( goalCell ) {
      this.path = Pathfinding.getPath( this.currentCell, goalCell );
      this.#updatePathSVG();
    }
  }

  #updatePathSVG() {
    const dStr = this.path?.length > 0 ? `M ${ this.x } ${ this.y } ${ this.path.map( e => ` ${ e.x } ${ e.y } ` ).join( 'L' ) }` : '';
    this.pathSVG.setAttribute( 'd', dStr );
  }

  distanceFrom( other ) {
    return Math.hypot( this.x - other.x, this.y - other.y );
  }

  tryAttack( attack ) {
    if ( this.life > 0 ) {
      this.life -= attack.damage;
      this.#updateHealthBar();

      createHitText( 'Hit!', this.x, this.y - this.spriteInfo.height );

      if ( this.life <= 0 ) {
        this.animationDiv.className = 'die';
        this.#updateSprite();
        this.spriteDiv.removeChild( this.healthBar );
      }
    }
  }

  update( { allies, enemies, dt } ) {
    if ( this.life <= 0 ) {
      return;
    }

    for ( const timer in this.timers ) {
      this.timers[ timer ] -= dt;
    }

    // Pursue enemy
    this.target ??= this.#getClosestEnemy( enemies );

    if ( this.target ) {
      if ( this.distanceFrom( this.target ) < this.attack.range ) {
        this.#aimToward( this.target );
        this.path = null;

        if ( this.timers.attack < 0 ) {
          this.timers.attack = TIME_BETWEEN_ATTACKS;

          if ( this.target.life > 0 ) {
            this.target.tryAttack( this.attack );

            this.animationDiv.className = this.attack.action;

            this.animationDiv.addEventListener( 'animationend', () => {
              if ( this.life > 0 ) {
                this.animationDiv.className = 'idle';
              }
            } ); 
          }
          else {
            this.target = null;
          }
        }
      }
      else {
        this.path = Pathfinding.getPath( this.currentCell, this.target.currentCell );
      }
    }

    // Wander around home cell
    else {
      this.path ??= Pathfinding.getPath( 
        this.currentCell,
        this.homeCell.getRandomNeighbor().getRandomNeighbor().getRandomNeighbor().getRandomNeighbor()    // TODO: increase depth for more variety?
      );
    }

    // switch ( this.state ) {
    //   case State.Waiting:
    //     if ( this.timers.wait < 0 ) {
    //       this.timers.wander = TIME_TO_WANDER;
    //       this.state = State.Wandering;
    //     }
    //     else {
    //       this.animationDiv.className = this.path ? 'walk' : 'idle';
    //     }
    //     break;

    //   case State.Wandering:
    //     if ( this.timers.wander < 0 ) {
    //       this.timers.wait = TIME_TO_WAIT;
    //       this.state = State.Waiting;
    //     }
    //     else {
    //       let closestEnemy = null, closestDist = TARGET_RANGE;
    //       enemies.forEach( enemy => {
    //         const dist = this.distanceFrom( enemy );
    //         if ( dist < closestDist ) {
    //           closestDist = dist;
    //           closestEnemy = enemy;
    //         }
    //       } );
          
    //       if ( closestEnemy ) {
    //         this.target = closestEnemy;
    //         this.state = State.OnTarget;
    //       }
    //       else {
    //         this.path ??= Pathfinding.getPath( 
    //           this.currentCell,
    //           this.homeCell.getRandomNeighbor().getRandomNeighbor().getRandomNeighbor().getRandomNeighbor()    // TODO: increase depth for more variety?
    //         );
    //         this.animationDiv.className = this.path ? 'walk' : 'idle';
    //       }
    //     }
    //     break;

    //   case State.OnTarget:
    //     if ( this.target.life <= 0 ) {
    //       this.target = null;

    //       this.timers.wander = TIME_TO_WANDER;
    //       this.state = State.Wandering;
    //     }
    //     else if ( this.distanceFrom( this.target ) < this.attack.range ) {
    //       this.angle = Math.atan2( this.target.y - this.y, this.target.x - this.x );
    //       this.path = null;

    //       if ( this.timers.attack < 0 ) {
    //         this.timers.attack = TIME_BETWEEN_ATTACKS;

    //         this.target.tryAttack( this.attack );
    //         this.animationDiv.className = '';   // reset animation
    //         this.animationDiv.className = this.attack.action;
    //       }
    //     }
    //     else {
    //       this.path = Pathfinding.getPath( this.currentCell, this.target.currentCell );
    //       this.animationDiv.className = 'walk';
    //     }

    //     break; 
    // }

    if ( this.path ) {
      this.animationDiv.className = 'walk';
      this.#followWaypoints( dt );
    }
    // else {
    //   this.animationDiv.className = 'idle';
    // }

    this.#updateSprite();
  }

  #getClosestEnemy( enemies ) {
    let closestEnemy = null, closestDist = TARGET_RANGE;
    enemies.forEach( enemy => {
      const dist = this.distanceFrom( enemy );
      if ( dist < closestDist ) {
        closestDist = dist;
        closestEnemy = enemy;
      }
    } );

    return closestEnemy;
  }

  #aimToward( point ) {
    this.angle = Math.atan2( point.y - this.y, point.x - this.x );

    // const dir = directionFromAngle( this.angle );
    // const dirIndex = spriteInfo.dirIndex[ dir ];
    // this.spriteDiv.scrollTop = dirIndex * this.spriteInfo.height;

    // TODO: Set margin here based on centers?
  }

  #followWaypoints( dt ) {
    let moveDist = this.speed * dt;

    while ( moveDist > 0 && this.path?.length > 0 ) {
      const waypoint = this.path[ 0 ];
      const distToWaypoint = Math.hypot( waypoint.x - this.x, waypoint.y - this.y );

      if ( distToWaypoint < moveDist ) {
        this.x = waypoint.x;
        this.y = waypoint.y;
        this.currentCell = this.path.shift();
        this.#updatePathSVG();
      }
      else {
        this.#aimToward( waypoint );
        // this.angle = Math.atan2( waypoint.y - this.y, waypoint.x - this.x );
        this.x += Math.cos( this.angle ) * moveDist;
        this.y += Math.sin( this.angle ) * moveDist;
      }

      moveDist -= distToWaypoint;
    }

    if ( this.path?.length == 0 ) {
      this.path = null;
    }
  }

  #updateSprite() {
    const spriteInfo = this.spriteInfo;

    const dir = directionFromAngle( this.angle );
    const dirIndex = spriteInfo.dirIndex[ dir ];
    this.spriteDiv.scrollTop = dirIndex * this.spriteInfo.height;

    // TODO: Use margins for this instead? (goblin is the one that messes it up)
    const center = spriteInfo.centers ? spriteInfo.centers[ dir ] : spriteInfo.center;
    const x = Math.floor( this.x - center.x );
    const y = Math.floor( this.y - center.y );

    const style = this.spriteDiv.style;
    style.transform = `translate( ${ x }px, ${ y }px )`;

    // TODO: Instead of this, maybe the whole div gets set to zIndex 0
    //       as part of removing actor from active roster?
    // TODO: Or can we make this part of the die animation?
    style.zIndex = /*this.action == 'die' ? 0 :*/ Math.floor( this.y );    // dead bodies should be on the ground
  }

  #updateHealthBar() {
    const lifePerc = 100 * this.life / this.maxLife;
    this.healthBar.style.background = `linear-gradient( 90deg, green ${lifePerc}%, transparent ${lifePerc}% )`;
  }
}

function directionFromAngle( angle ) {
  if ( angle < ( -3 / 4 ) * Math.PI )   return 'west';
  if ( angle < ( -1 / 4 ) * Math.PI )   return 'north';
  if ( angle < (  1 / 4 ) * Math.PI )   return 'east';
  if ( angle < (  3 / 4 ) * Math.PI )   return 'south';

  return 'west';
}

function createHitText( str, x, y ) {
  const div = document.createElement( 'div' );
  div.className = 'hitText';
  div.innerText = str;
  div.style.transform = `translate( ${ x }px, ${ y }px )`;
  div.addEventListener( 'animationend', removeAnimatedElement );
  document.body.appendChild( div );
}

function removeAnimatedElement( animationEvent ) {
  const element = animationEvent.srcElement;
  element.parentElement.removeChild( element );
}