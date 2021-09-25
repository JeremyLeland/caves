import { TileSize } from './tilemap.js';
import * as Pathfinding from './pathfinding.js';

const TIME_BETWEEN_FRAMES = 100;
const TIME_TO_WAIT = 3000;

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

  constructor( json ) {
    const actorInfo = actorInfos[ json.actorInfoKey ];

    const div = document.createElement( 'div' );
    div.setAttribute( 'class', `actor ${ actorInfo.spriteInfoKey }` );
    document.body.appendChild( div );

    actorInfo.layers.forEach ( layer => {
      const layerDiv = document.createElement( 'div' );
      layerDiv.setAttribute( 'class', `layer ${ layer }` );
      div.appendChild( layerDiv );
    });

    const pathSVG = Pathfinding.getPathSVG( null );   // give us empty SVG for now
    document.body.appendChild( pathSVG );

    this.x = ( json.col + 0.5 ) * TileSize;
    this.y = ( json.row + 0.5 ) * TileSize; 
    this.team = json.team;
    this.angle = Math.PI / 2;
    this.life = actorInfo.life;
    this.speed = actorInfo.speed;
    this.attack = actorInfo.attack;
    this.timers = { frame: 0, wait: 0 };
    this.spriteInfo = spriteInfos[ actorInfo.spriteInfoKey ];
    this.div = div;
    this.pathSVG = pathSVG;

    this.setAction( 'idle' );
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

      if ( this.life <= 0 ) {
        this.setAction( 'die' );
      }
    }
  }

  setAction( action ) {
    if ( this.action != action ) {
      this.action = action;
      this.frame = 0;
    }
  }

  update( { others, dt } ) {
    if ( this.timers.wait > 0 ) {
      this.timers.wait -= dt;
    }
    else {
      // Don't try to start an attack or move if we are already attacking (or dying)
      if ( this.action == 'idle' || this.action == 'walk' ) {
        if ( this.target && this.distanceFrom( this.target ) < TileSize ) {
          this.action = this.attack.action;
          this.frame = 0;
          this.target.tryAttack( this.attack );
        }
        else {
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
              this.setAction( 'walk' );
            }
            else {
              this.path = null;
              this.setAction( 'idle' );
              this.timers.wait = this.target ? 0 : TIME_TO_WAIT;
            }
          }
        }
      }

      this.#updateFrame( dt );
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

  #updateFrame( dt ) {
    this.timers.frame -= dt;

    if ( this.timers.frame < 0 ) {
      this.timers.frame += TIME_BETWEEN_FRAMES;

      const action = this.spriteInfo.actions[ this.action ];
      this.frame = ( this.frame + 1 ) % action.frames;

      if ( this.frame == 0 && !action.loop ) {
        this.setAction( this.life > 0 ? 'idle' : 'dead' );
      }
    }
  }

  #updateSprite() {
    const spriteInfo = this.spriteInfo;

    const dir = ( this.action == 'die' || this.action == 'dead' ) ? 'north' : directionFromAngle( this.angle );

    const action = spriteInfo.actions[ this.action ];

    const center = spriteInfo.centers ? spriteInfo.centers[ dir ] : spriteInfo.center;
    const col = action.col + this.frame;

    const dirIndex = spriteInfo.dirIndex[ dir ];
    const row = action.row + dirIndex;

    const style = this.div.style;
    const x = Math.floor( this.x - center.x );
    const y = Math.floor( this.y - center.y );
    style.transform = `translate( ${ x }px, ${ y }px )`;
    style.zIndex = Math.floor( this.y );
    style.backgroundPosition = `-${ col * 100 }% -${ row * 100 }%`;
  }
}

function directionFromAngle( angle ) {
  if ( angle < ( -3 / 4 ) * Math.PI )   return 'west';
  if ( angle < ( -1 / 4 ) * Math.PI )   return 'north';
  if ( angle < (  1 / 4 ) * Math.PI )   return 'east';
  if ( angle < (  3 / 4 ) * Math.PI )   return 'south';

  return 'west';
}