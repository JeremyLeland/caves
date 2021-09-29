import { TileSize } from './tilemap.js';
import * as Pathfinding from './pathfinding.js';

// TODO: Move these to json somewhere?
const TIME_BETWEEN_FRAMES = 100;
const TIME_TO_WAIT = 3000;
const TIME_BETWEEN_ATTACKS = 1000;

// TODO: Do these as part of init() and do them in parallel?
const spriteInfos = await ( await fetch( './spriteInfos.json' ) ).json();
const actorInfos  = await ( await fetch( './actorInfos.json'  ) ).json();

export class Actor {
  static prepareCSS() {
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

  constructor( json ) {
    const actorInfo = actorInfos[ json.actorInfoKey ];

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
    document.body.appendChild( spriteDiv );

    const pathSVG = Pathfinding.getPathSVG( null );   // give us empty SVG for now
    document.body.appendChild( pathSVG );

    this.x = ( json.col + 0.5 ) * TileSize;
    this.y = ( json.row + 0.5 ) * TileSize; 
    this.team = json.team;
    this.angle = Math.PI / 2;
    this.life = actorInfo.life;
    this.speed = actorInfo.speed;
    this.attack = actorInfo.attack;
    this.timers = { wait: 0, attack: 0 };
    this.spriteInfo = spriteInfos[ actorInfo.spriteInfoKey ];
    this.spriteDiv = spriteDiv;
    this.animationDiv = animDiv;
    this.pathSVG = pathSVG;

    this.action = 'idle';
  }

  setGoalNode( goalNode ) {
    if ( goalNode ) {
      this.path = Pathfinding.getPath( this.currentNode, goalNode );
      this.#updatePathSVG();
    }
  }

  #updatePathSVG() {
    this.pathSVG.firstChild.setAttribute( 'd', Pathfinding.getPathSVGDString( this.path ) );
  }

  distanceFrom( other ) {
    return Math.hypot( this.x - other.x, this.y - other.y );
  }

  tryAttack( attack ) {
    if ( this.life > 0 ) {
      this.life -= attack.damage;

      // TODO: Create hit text element
      createHitText( 'Hit!', this.x, this.y - this.spriteInfo.height );

      if ( this.life <= 0 ) {
        this.action = 'die';
      }
    }
  }

  // TODO: State (idle, move, attack) vs action (animation)

  update( { others, dt } ) {
    if ( this.life > 0 ) {
      if ( this.timers.attack > 0 ) {
        this.timers.attack -= dt;
      }

      if ( this.timers.wait > 0 ) {
        this.timers.wait -= dt;
      }
      else {
        if ( this.target && this.distanceFrom( this.target ) < TileSize ) {
          this.action = this.attack.action;
          this.path = null;
        }
        else {
          this.action = 'walk';
        }

        // Don't try to start an attack or move if we are already attacking (or dying)
        if ( this.action == this.attack.action ) {
          if ( this.timers.attack <= 0 ) {
            this.target.tryAttack( this.attack );
            this.animationDiv.className = '';   // reset animation
            this.timers.attack += TIME_BETWEEN_ATTACKS;
          }
        }
        else if ( this.action == 'walk' ) {
          // this.frame = 0;
          // TODO: Wait a bit if we are tooClose (so we aren't twitching so much)
          const tooClose = false; /*others.some( other => {
            const cx = other.x - this.x;
            const cy = other.y - this.y;
            const otherInFront = 0 < cx * Math.cos( this.angle ) + cy * Math.sin( this.angle );
            const distToOther = Math.hypot( this.x - other.x, this.y - other.y );

            return otherInFront && distToOther < TileSize;
          } );*/

          if ( !tooClose ) {
            this.#doMove( dt );

            if ( this.path?.length > 0 ) {
              this.action = 'walk';
            }
            else {
              this.path = null;
              this.action = 'idle';
              this.timers.wait = this.target ? 0 : TIME_TO_WAIT;
            }
          }
        }
      }
    }

    this.#updateSprite();
  }

  #doMove( dt ) {
    let moveDist = this.speed * dt;

    while ( moveDist > 0 && this.path?.length > 0 ) {
      const waypoint = this.path[ 0 ];
      const distToWaypoint = Math.hypot( waypoint.x - this.x, waypoint.y - this.y );

      if ( distToWaypoint < moveDist ) {
        this.x = waypoint.x;
        this.y = waypoint.y;
        this.currentNode = this.path.shift();
        this.#updatePathSVG();
      }
      else {
        this.angle = Math.atan2( waypoint.y - this.y, waypoint.x - this.x );
        this.x += Math.cos( this.angle ) * moveDist;
        this.y += Math.sin( this.angle ) * moveDist;
      }

      moveDist -= distToWaypoint;
    }
  }

  #updateSprite() {
    const spriteInfo = this.spriteInfo;

    const dir = this.action == 'die' ? 'north' : directionFromAngle( this.angle );
    const dirIndex = spriteInfo.dirIndex[ dir ];
    this.spriteDiv.scrollTop = dirIndex * this.spriteInfo.height;

    const center = spriteInfo.centers ? spriteInfo.centers[ dir ] : spriteInfo.center;
    const x = Math.floor( this.x - center.x );
    const y = Math.floor( this.y - center.y );

    const style = this.spriteDiv.style;
    style.transform = `translate( ${ x }px, ${ y }px )`;

    // TODO: Instead of this, maybe the whole div gets set to zIndex 0
    //       as part of removing actor from active roster?
    style.zIndex = this.action == 'die' ? 0 : Math.floor( this.y );    // dead bodies should be on the ground

    this.animationDiv.className = this.action;
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