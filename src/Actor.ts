// import { Node } from './Pathfinding.js';
// import { TextParticle } from './Particles.js';

export enum Direction {
  North, West, South, East
};
export enum Action {
  Idle, Walk, Attack, Die
};

const TIME_BETWEEN_FRAMES = 100;
const TIME_BETWEEN_ATTACKS = 1000;

interface ActionInfo {
  col: number;
  row: number;
  frames: number;
  nextAction?: Action;
};

enum HumanoidAttack {
  Cast, Thrust, Slash, Shoot
};

const HumanoidAttackInfos: Record< HumanoidAttack, ActionInfo > = {
  [ HumanoidAttack.Cast ]:    { col: 1, row:  0, frames:  6, nextAction: Action.Idle },
  [ HumanoidAttack.Thrust ]:  { col: 1, row:  4, frames:  7, nextAction: Action.Idle },
  [ HumanoidAttack.Slash ]:   { col: 1, row: 12, frames:  5, nextAction: Action.Idle },
  [ HumanoidAttack.Shoot ]:   { col: 1, row: 16, frames: 12, nextAction: Action.Idle },
};

const HumanoidActionInfos: Record< Action, ActionInfo> = {
  [ Action.Idle ]:    { col: 0, row: 0, frames: 1, nextAction: Action.Idle },
  [ Action.Walk ]:    { col: 1, row: 8, frames: 8, nextAction: Action.Walk },
  [ Action.Attack ]:  HumanoidAttackInfos[ HumanoidAttack.Slash ],
  [ Action.Die ]:     { col: 1, row: 20, frames: 5 }
};

const WIDTH = 64, HEIGHT = 64;
const CENTER_X = 31, CENTER_Y = 60;

export class Actor {
  #x = 0;
  #y = 0;
  #angle = Math.PI / 2;   // aim south by default (facing the screen)
  #speed = 0.1;
  #life = 100;

  #spriteSheet : HTMLCanvasElement;
  #action = Action.Idle;
  #actionInfo = HumanoidActionInfos[Action.Idle];
  #frame = 0;

  #target = null;
  #goalNode = null;
  #currentNode = null;
  #pathToGoal = null;
  #waypoint = null;

  #timers = { frame: 0, attack: 0 };

  constructor( layers: Array< HTMLImageElement > ) {
    this.#spriteSheet = getCombinedSpriteSheet( layers );
  }

  get x() { return this.#x; }
  get y() { return this.#y; }

  isAlive() { return this.#life > 0; }

  startAction( action: Action ) {
    if ( action != null && this.#action != action ) {
      this.#action = action;
      this.#actionInfo = HumanoidActionInfos[action];

      this.#timers.frame = TIME_BETWEEN_FRAMES;
      this.#frame = 0;
    }
  }

  // getEmptyNearbyNode() {
  //   const emptyNearbyNodes = [...this.#currentNode.linkedNodes].filter( node => node.occupants.size == 0 );
  //   return emptyNearbyNodes[ Math.floor( Math.random() * emptyNearbyNodes.length ) ];
  // }


  spawnAtPoint(x: number, y: number) {
    this.#x = x;
    this.#y = y;
  }

  distanceFromActor( actor: Actor ): number {
    return actor == null ? Infinity : this.distanceFromPoint(actor.x, actor.y);
  }

  distanceFromPoint( x: number, y: number ): number {
    return Math.hypot( x - this.#x, y - this.#y );
  }

  aimTowardActor( actor: Actor ) {
    this.aimTowardPoint( actor.x, actor.y );
  }

  aimTowardPoint( x: number, y: number ) {
    this.#angle = Math.atan2( y - this.#y, x - this.#x );
  }


  //
  // Navigation
  //
  // getCurrentNode() {
  //   return this.#currentNode;
  // }

  // setCurrentNode( node ) {
  //   this.#currentNode = node;
  // }

  // spawnAtNode(node) {
  //   this.#x = node.x;
  //   this.#y = node.y;
  //   this.setCurrentNode( node );
  // }

  // setTarget(target) {
  //   this.#target = target;
  //   this.setGoal( this.#target.#currentNode );
  // }

  // setGoal( node ) {
  //   // Make sure goal is valid before setting it
  //   // save path to goal so we can draw it for debugging purposes
  //   this.#pathToGoal = Node.A_Star( this.#currentNode, node );
  //   if ( this.#pathToGoal != null ) {
  //     this.#pathToGoal?.shift();   // ignore first waypoint, since we're already there
  //     this.#goalNode = node;
  //   }
  //   else {
  //     this.#goalNode = null;
  //   }
  // }

  // #getNextWaypoint() {
  //   if ( this.#target != null ) {
  //     this.setGoal( this.#target.getCurrentNode() );
  //   }

  //   return this.#pathToGoal?.shift();
  // }

  // #moveTowardGoal(dt) {
  //   if (this.#waypoint == null) {
  //     this.#waypoint = this.#getNextWaypoint();
  //   }

  //   if (this.#waypoint != null) {
  //     const dist = this.#speed * dt;

  //     if (this.distanceFromPoint(this.#waypoint.x, this.#waypoint.y) < dist) {
  //       this.#x = this.#waypoint.x;
  //       this.#y = this.#waypoint.y;
  //       this.setCurrentNode( this.#waypoint );
  //       this.#waypoint = this.#getNextWaypoint();
  //     }

  //     if (this.#waypoint == null) {
  //       this.startAction(Action.Idle);
  //     }
  //     else {
  //       this.aimTowardPoint(this.#waypoint.x, this.#waypoint.y);
  //       this.#x += Math.cos(this.#angle) * dist;
  //       this.#y += Math.sin(this.#angle) * dist;

  //       this.startAction( Action.Walk );
  //     }
  //   }
  // }

  #updateFrame() {
    if (this.#timers.frame < 0) {
      this.#timers.frame += TIME_BETWEEN_FRAMES;

      if ( this.#frame == this.#actionInfo.frames - 1 ) {
        if ( this.#actionInfo.nextAction != null ) {
          this.#frame = 0;
          this.startAction( this.#actionInfo.nextAction );
        }
      }
      else {
        this.#frame ++;
      }
    }
  }

  #targetInRange() {
    return this.#target != null && this.#target.isAlive() &&
      this.distanceFromActor( this.#target ) < 50;
  }

  hit( damage: number ) {
    this.#life -= damage;

    if ( !this.isAlive() ) {
      this.startAction( Action.Die );
    }
  }

  update( dt: number /*, world*/ ) {
    for ( let timer in this.#timers ) {
      this.#timers[ timer ] -= dt;
    }
    this.#updateFrame();

    // if ( this.isThinker && this.#pathToGoal == null ) {
    //   this.setGoal( world.tileMap.getRandomNode() );
    // }

    if ( this.#targetInRange() ) {
      this.aimTowardActor( this.#target );

      if ( this.#timers.attack < 0 ) {
        this.#timers.attack = TIME_BETWEEN_ATTACKS;

        this.startAction( Action.Attack );

        this.#target.hit( 10 ); // TODO: Don't hard code this

        // TODO: This should conincide with actual attack and damage code
        // world.particles.push( new TextParticle( {
        //   x: ( this.x + this.#target.x ) / 2,
        //   y: ( this.y + this.#target.y ) / 2,
        //   text: 'Hit!',
        //   color: 'white'
        // } ) );

      }
    }
    else {
      // this.#moveTowardGoal( dt );
    }
  }

  draw( ctx: CanvasRenderingContext2D ) {
    if ( this.#pathToGoal != null ) {
      drawPath( ctx, this.#pathToGoal );
    }

    const sheetX = WIDTH * ( this.#actionInfo.col + this.#frame );
    const sheetY = HEIGHT * ( this.#actionInfo.row +
      ( this.#action == Action.Die ? 0 : directionFromAngle( this.#angle ) ) ); // Die only has one direction

    const destX = Math.floor( this.#x - CENTER_X );
    const destY = Math.floor( this.#y - CENTER_Y );

    ctx.drawImage( this.#spriteSheet, sheetX, sheetY, WIDTH, HEIGHT, destX, destY, WIDTH, HEIGHT );
  }

  static async loadImages( paths: Array< string > ) {
    const images = Array.from( paths, path => {
      const image = new Image();
      image.src = path;
      return image;
    });

    await Promise.all( images.map( image => image.decode() ) );

    return images;
  }
}

function getCombinedSpriteSheet( layers: Array< HTMLImageElement > ): HTMLCanvasElement {
  const canvas = document.createElement( 'canvas' ) as HTMLCanvasElement;
  canvas.width = layers[ 0 ].width;
  canvas.height = layers[ 0 ].height;
  const ctx = canvas.getContext( '2d' );

  layers.forEach( layer => ctx.drawImage( layer, 0, 0 ) );

  return canvas;
}

function directionFromAngle( angle: number ): Direction {
  if (angle < (-3/4) * Math.PI)  return Direction.West;
  if (angle < (-1/4) * Math.PI)  return Direction.North;
  if (angle < ( 1/4) * Math.PI)  return Direction.East;
  if (angle < ( 3/4) * Math.PI)  return Direction.South;

  return Direction.West;
}

function drawPath( ctx, path ) {
  for (let i = 0; i < path.length; i ++) {
    // go from yellow to green
    const percent = i / path.length;
    ctx.fillStyle = `rgba(${255 - percent * 255}, 255, 0, 0.3)`;
    ctx.strokeStyle = `rgba(${255 - percent * 255}, 255, 0, 0.3)`;

    const node = path[i];

    ctx.beginPath();
    ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
    ctx.fill();

    if (i > 0) {
      const lastNode = path[i-1];
      ctx.beginPath();
      ctx.moveTo(lastNode.x, lastNode.y);
      ctx.lineTo(node.x, node.y);
      ctx.stroke();
    }
  }
}
