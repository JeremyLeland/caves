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

    styleSheet.insertRule( '.sprite { position: absolute; overflow: hidden; }' );
    styleSheet.insertRule( '.layer { position: absolute; left: inherit; top: inherit; }' );

    for ( let spriteInfoKey in spriteInfos ) {
      const spriteInfo = spriteInfos[ spriteInfoKey ];
      styleSheet.insertRule( `.${ spriteInfoKey } { 
        width: ${ spriteInfo.width }; 
        height: ${ spriteInfo.height };
      }` );

      for ( let actionInfoKey in spriteInfo[ 'actions' ] ) {
        const actionInfo = spriteInfo[ 'actions' ][ actionInfoKey ];
        const duration = '1'; // TODO: Specify animation-duration in spriteInfos json
        const steps = actionInfo.frames + ( actionInfo.final ? -1 : 0 );
        const iterations = actionInfo.loop ? 'infinite' : '1';
        const fill = actionInfo.final ? 'forwards' : '';

        const top = spriteInfo.height * actionInfo.row;

        styleSheet.insertRule( `.${ spriteInfoKey } > .${ actionInfoKey } {
          animation-name: ${ spriteInfoKey }_${ actionInfoKey };
          animation-duration: ${ duration }s;
          animation-timing-function: steps( ${ steps } );
          animation-iteration-count: ${ iterations };
          ${ actionInfo.final ? 'animation-fill-mode: forwards;' : '' };
          top: -${ top };
        }` );
        
        const fromLeft = spriteInfo.width * actionInfo.col;
        const toLeft   = spriteInfo.width * ( actionInfo.col + steps );

        styleSheet.insertRule( `@keyframes ${ spriteInfoKey }_${ actionInfoKey } {
          from { left: -${ fromLeft }; }
          to   { left: -${ toLeft   }; }
        }` );
      }
    }

    // for ( let actorInfoKey in actorInfos ) {
    //   const actorInfo = actorInfos[ actorInfoKey ];
    //   actorInfo.layers.forEach( layer => {
    //     styleSheet.insertRule( `.${ actorInfo.spriteInfoKey } > .${ layer } {
    //       background-image: url( ${ actorInfo.imagesPath }/${ layer }.png );
    //     }` );
    //   } );
    // }
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

    //this.setAction( 'idle' );
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

      if ( this.life <= 0 ) {
        // this.setAction( 'die' );
        this.action = 'die';
      }
    }
  }

  // setAction( action ) {
  //   if ( this.action != action ) {
  //     this.action = action;
  //     this.frame = 0;
  //   }
  // }

  // TODO: State (idle, move, attack) vs action (animation)

  update( { others, dt } ) {
    if ( this.timers.attack > 0 ) {
      this.timers.attack -= dt;
    }

    if ( this.timers.wait > 0 ) {
      this.timers.wait -= dt;
    }
    else {
      if ( this.target && this.distanceFrom( this.target ) < TileSize ) {
        this.action = this.attack.action;
      }
      else {
        this.action = 'walk';
      }

      // Don't try to start an attack or move if we are already attacking (or dying)
      if ( this.action == this.attack.action ) {
        if ( this.timers.attack <= 0 ) {
          this.target.tryAttack( this.attack );
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
            //this.setAction( 'walk' );
            this.action = 'walk';
          }
          else {
            this.path = null;
            //this.setAction( 'idle' );
            this.action = 'idle';
            this.timers.wait = this.target ? 0 : TIME_TO_WAIT;
          }
        }
      }

      // this.#updateFrame( dt );
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

  // #updateFrame( dt ) {
  //   this.timers.frame -= dt;

  //   if ( this.timers.frame < 0 ) {
  //     this.timers.frame += TIME_BETWEEN_FRAMES;

  //     const action = this.spriteInfo.actions[ this.action ];
  //     this.frame = ( this.frame + 1 ) % action.frames;

  //     if ( this.frame == 0 && !action.loop ) {
  //       this.setAction( this.life > 0 ? 'idle' : 'dead' );
  //     }
  //   }
  // }

  #updateSprite() {
    const spriteInfo = this.spriteInfo;

    const dir = ( this.action == 'die' || this.action == 'dead' ) ? 'north' : directionFromAngle( this.angle );
    const dirIndex = spriteInfo.dirIndex[ dir ];
    this.spriteDiv.scrollTop = dirIndex * this.spriteInfo.height;

    // const action = spriteInfo.actions[ this.action ];

    // const col = action.col + this.frame;

    // const row = action.row + dirIndex;

    const center = spriteInfo.centers ? spriteInfo.centers[ dir ] : spriteInfo.center;
    const x = Math.floor( this.x - center.x );
    const y = Math.floor( this.y - center.y );

    const style = this.spriteDiv.style;
    style.transform = `translate( ${ x }px, ${ y }px )`;
    style.zIndex = this.action == 'dead' ? 0 : Math.floor( this.y );    // dead bodies should be on the ground
    // style.backgroundPosition = `-${ col * 100 }% -${ row * 100 }%`;

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