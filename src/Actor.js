import { Node } from '../src/Pathfinding.js';
import { TextParticle } from './Particles.js';

export const Direction = {
  North: 0, West: 1, South: 2, East: 3
};
export const Action = {
  Idle: 0, Walk: 1, Attack: 2, Die: 3
}

const TIME_BETWEEN_FRAMES = 100;
const TIME_BETWEEN_ATTACKS = 1000;

const HumanoidActionInfo = {
  [Action.Idle]: { col: 0, row: 0, frames: 1, nextAction: Action.Idle },
  [Action.Walk]: { col: 1, row: 8, frames: 8, nextAction: Action.Walk },
  [Action.Attack]: {
    Cast:   { col: 1, row:  0, frames:  6, nextAction: Action.Idle },
    Thrust: { col: 1, row:  4, frames:  7, nextAction: Action.Idle },
    Slash:  { col: 1, row: 12, frames:  5, nextAction: Action.Idle },
    Shoot:  { col: 1, row: 16, frames: 12, nextAction: Action.Idle },
  },
  [Action.Die]: { col: 1, row: 20, frames: 5 }
};

const WIDTH = 64, HEIGHT = 64;
const CENTER_X = 31, CENTER_Y = 60;

export class Actor {
  #x = 0;
  #y = 0;
  #angle = Math.PI / 2;   // aim south by default (facing the screen)
  #speed = 0.1;
  #life = 100;

  #sprites;

  #action = Action.Idle;
  #actionInfo = HumanoidActionInfo[Action.Idle];

  #currentNode = null;
  #goalNode = null;
  #pathToGoal = null;
  #waypoint = null;

  #target = null;

  #timers = { frame: 0, attack: 0 };

  #frame = 0;

  constructor(sprites) {
    this.#sprites = sprites;
    this.isThinker = true;
  }

  get x() { return this.#x; }
  get y() { return this.#y; }

  isAlive() { return this.#life > 0; }

  startAction(action) {
    if ( action != null && this.#action != action ) {
      this.#action = action;
      // TODO: figure out our actual attack action, don't just hardcode Slash
      this.#actionInfo = action == Action.Attack ? 
        HumanoidActionInfo[Action.Attack].Slash : HumanoidActionInfo[action];
  
      this.#timers.frame = TIME_BETWEEN_FRAMES;
      this.#frame = 0;
    }
  }
  
  // getEmptyNearbyNode() {
  //   const emptyNearbyNodes = [...this.#currentNode.linkedNodes].filter( node => node.occupants.size == 0 );
  //   return emptyNearbyNodes[ Math.floor( Math.random() * emptyNearbyNodes.length ) ];
  // }


  spawnAtPoint(x, y) {
    this.#x = x;
    this.#y = y;
  }

  distanceFromActor(actor) {
    return actor == null ? Infinity : this.distanceFromPoint(actor.x, actor.y);
  }

  distanceFromPoint(x, y) {
    return Math.hypot( x - this.#x, y - this.#y );
  }

  aimTowardActor(actor) {
    this.aimTowardPoint(actor.x, actor.y);
  }

  aimTowardPoint(x, y) {
    this.#angle = Math.atan2(y - this.#y, x - this.#x);
  }


  //
  // Navigation
  //
  getCurrentNode() {
    return this.#currentNode;
  }

  setCurrentNode( node ) {
    this.#currentNode = node;
  }

  spawnAtNode(node) {
    this.#x = node.x;
    this.#y = node.y;
    this.setCurrentNode( node );
  }

  setTarget(target) {
    this.#target = target;
    this.setGoal( this.#target.#currentNode );
  }

  setGoal( node ) {
    // Make sure goal is valid before setting it
    // save path to goal so we can draw it for debugging purposes
    this.#pathToGoal = Node.A_Star( this.#currentNode, node );
    if ( this.#pathToGoal != null ) {
      this.#pathToGoal?.shift();   // ignore first waypoint, since we're already there
      this.#goalNode = node;
    }
    else {
      this.#goalNode = null;
    }
  }

  #getNextWaypoint() {
    if ( this.#target != null ) {
      this.setGoal( this.#target.getCurrentNode() );
    }

    return this.#pathToGoal?.shift();
  }

  #moveTowardGoal(dt) {    
    if (this.#waypoint == null) {
      this.#waypoint = this.#getNextWaypoint();
    }

    if (this.#waypoint != null) {
      const dist = this.#speed * dt;

      if (this.distanceFromPoint(this.#waypoint.x, this.#waypoint.y) < dist) {
        this.#x = this.#waypoint.x;
        this.#y = this.#waypoint.y;
        this.setCurrentNode( this.#waypoint );
        this.#waypoint = this.#getNextWaypoint();
      }

      if (this.#waypoint == null) {
        this.startAction(Action.Idle);
      }
      else {
        this.aimTowardPoint(this.#waypoint.x, this.#waypoint.y);
        this.#x += Math.cos(this.#angle) * dist;
        this.#y += Math.sin(this.#angle) * dist;

        this.startAction( Action.Walk );
      }      
    }
  }

  #updateFrame(dt) {
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

  hit( damage ) {
    this.#life -= damage;

    if ( !this.isAlive() ) {
      this.startAction( Action.Die );
    }
  }

  update( dt, world ) {
    for ( let timer in this.#timers ) {
      this.#timers[ timer ] -= dt;
    }

    if ( this.isThinker && this.#pathToGoal == null ) { 
      this.setGoal( world.tileMap.getRandomNode() );
    }

    if ( this.#timers.attack < 0 ) {

      if ( this.#targetInRange() ) {
        this.aimTowardActor( this.#target );
        this.startAction( Action.Attack );

        this.#target.hit( 10 ); // TODO: Don't hard code this

        // TODO: This should conincide with actual attack and damage code
        world.particles.push( new TextParticle( {
          x: ( this.x + this.#target.x ) / 2,
          y: ( this.y + this.#target.y ) / 2,
          text: 'Hit!',
          color: 'white'
        } ) );

        this.#timers.attack = TIME_BETWEEN_ATTACKS;
      }
      else {
        this.#moveTowardGoal( dt );
      }
    }

    this.#updateFrame(dt);
  }

  draw(ctx) {
    if (this.#pathToGoal != null) {
      drawPath(ctx, this.#pathToGoal);
    }
    
    const sheetX = WIDTH * (this.#actionInfo.col + this.#frame);
    const sheetY = HEIGHT * (this.#actionInfo.row +
      (this.#action == Action.Die ? 0 : directionFromAngle(this.#angle))); // Die only has one direction
    
    const destX = Math.floor(this.#x - CENTER_X);
    const destY = Math.floor(this.#y - CENTER_Y);
    
    this.#sprites.forEach(sprite => {
      ctx.drawImage(sprite, sheetX, sheetY, WIDTH, HEIGHT, destX, destY, WIDTH, HEIGHT);
    });
  }
}

function directionFromAngle(angle) {
  if (angle < (-3/4) * Math.PI)  return Direction.West;
  if (angle < (-1/4) * Math.PI)  return Direction.North;
  if (angle < ( 1/4) * Math.PI)  return Direction.East;
  if (angle < ( 3/4) * Math.PI)  return Direction.South;

  return Direction.West;
}

function drawPath(ctx, path) {
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
