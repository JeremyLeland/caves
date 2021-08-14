import { World } from './World.js';
import { Sprite, Action, AnimationInfo } from './Sprite.js';
// import { Node } from './Pathfinding.js';
// import { TextParticle } from './Particles.js';


const TIME_BETWEEN_ATTACKS = 1000;

// TODO: Move these to a constants file?
export enum HumanoidAttack {
  Cast, Thrust, Slash, Shoot
};

export const HumanoidAttackInfos: Record< HumanoidAttack, AnimationInfo > = {
  [ HumanoidAttack.Cast ]:    { col: 1, row:  0, frames:  6 },
  [ HumanoidAttack.Thrust ]:  { col: 1, row:  4, frames:  7 },
  [ HumanoidAttack.Slash ]:   { col: 1, row: 12, frames:  5 },
  [ HumanoidAttack.Shoot ]:   { col: 1, row: 16, frames: 12 },
};

export const HumanoidAnimationInfos: Record< Action, AnimationInfo> = {
  [ Action.Idle ]:    { col: 0, row: 0, frames: 1 },
  [ Action.Walk ]:    { col: 1, row: 8, frames: 8, loop: true },
  [ Action.Attack ]:  HumanoidAttackInfos[ HumanoidAttack.Slash ],
  [ Action.Die ]:     { col: 1, row: 20, frames: 5 },
};


export class Actor {
  #x = 0;
  #y = 0;
  #angle = Math.PI / 2;   // aim south by default (facing the screen)
  #speed = 0.1;
  #life = 100;

  #sprite: Sprite;

  // #target = null;
  // #goalNode = null;
  // #currentNode = null;
  // #pathToGoal = null;
  // #waypoint = null;

  #timers = { attack: 0 };

  constructor( sprite: Sprite ) {
    this.#sprite = sprite;
  }

  get x() { return this.#x; }
  get y() { return this.#y; }

  isAlive() { return this.#life > 0; }


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


  // #targetInRange() {
  //   return this.#target != null && this.#target.isAlive() &&
  //     this.distanceFromActor( this.#target ) < 50;
  // }

  hit( damage: number ) {
    this.#life -= damage;

    if ( !this.isAlive() ) {
      this.#sprite.startAction( Action.Die );
    }
  }

  update( dt: number, world: World ) {
    for ( let timer in this.#timers ) {
      this.#timers[ timer ] -= dt;
    }

    this.#sprite.update( dt );

    // if ( this.isThinker && this.#pathToGoal == null ) {
    //   this.setGoal( world.tileMap.getRandomNode() );
    // }

    // if ( this.#targetInRange() ) {
    //   this.aimTowardActor( this.#target );

    //   if ( this.#timers.attack < 0 ) {
    //     this.#timers.attack = TIME_BETWEEN_ATTACKS;

    //     this.startAnimation( Action.Attack );

    //     this.#target.hit( 10 ); // TODO: Don't hard code this

        // TODO: This should conincide with actual attack and damage code
        // world.particles.push( new TextParticle( {
        //   x: ( this.x + this.#target.x ) / 2,
        //   y: ( this.y + this.#target.y ) / 2,
        //   text: 'Hit!',
        //   color: 'white'
        // } ) );

    //   }
    // }
    // else {
      // this.#moveTowardGoal( dt );
    // }
  }

  draw( ctx: CanvasRenderingContext2D ) {
    // if ( this.#pathToGoal != null ) {
    //   drawPath( ctx, this.#pathToGoal );
    // }

    this.#sprite.draw( ctx, this.#x, this.#y, this.#angle );
  }

}