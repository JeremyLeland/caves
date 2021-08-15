import { World } from './World.js';
import { Sprite, Action, AnimationInfo } from './Sprite.js';
import { Node } from './Pathfinding.js';
// import { TextParticle } from './Particles.js';

const TIME_BETWEEN_ATTACKS = 1000;
const TIME_BETWEEN_WANDERS = 5000;

export class Actor {
  #x = 0;
  #y = 0;
  #angle = Math.PI / 2;   // aim south by default (facing the screen)
  #speed = 0.1;
  #life = 100;

  #sprite: Sprite;

  // #target = null;
  goalNode : Node = null;
  #currentNode: Node = null;
  #pathToGoal : Array< Node > = null;
  // #waypoint = null;

  #timers = { attack: 0, wander: 0 };

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

  spawnAtNode( node: Node ) {
    this.#x = node.x;
    this.#y = node.y;
    this.#currentNode = node;
  }

  //
  // Distances and angles
  //
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

  #getWaypoint() {
    // if ( this.#target != null ) {
    //   this.setGoal( this.#target.getCurrentNode() );
    // }

    // return this.#pathToGoal?.shift();

    // TODO: Check if target's currentNode is same as our goalNode
    //       Update goal node and recalculate path if different

    if ( this.goalNode != null ) {
      if ( this.#pathToGoal == null || 
           this.#pathToGoal[ this.#pathToGoal.length - 1] != this.goalNode ) {
        this.#pathToGoal = Node.A_Star( this.#currentNode, this.goalNode );
      }

      return this.#pathToGoal?.[ 0 ];
    }

    return null;
  }

  #moveTowardGoal( dt: number ) {
    let waypoint = this.#getWaypoint();

    if ( waypoint ) {
      let moveDistance = this.#speed * dt;
      const distToWaypoint = this.distanceFromPoint( waypoint.x, waypoint.y );

      if ( distToWaypoint < moveDistance ) {
        this.#x = waypoint.x;
        this.#y = waypoint.y;
        moveDistance -= distToWaypoint;

        this.#currentNode = this.#pathToGoal.shift();
        waypoint = this.#pathToGoal[ 0 ];
      }

      if ( waypoint ) {
        this.aimTowardPoint( waypoint.x, waypoint.y );
        this.#x += Math.cos( this.#angle ) * moveDistance;
        this.#y += Math.sin( this.#angle ) * moveDistance;

        this.#sprite.startAction( Action.Walk );
      }
      else {
        this.#sprite.startAction( Action.Idle );
      }
    }
  }


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

    if ( this.#timers.wander < 0 ) {
      this.#timers.wander += TIME_BETWEEN_WANDERS;

      this.goalNode = world.getRandomNode();
    }

      this.#moveTowardGoal( dt );
    // }
  }

  draw( ctx: CanvasRenderingContext2D ) {
    // if ( this.#pathToGoal != null ) {
    //   drawPath( ctx, this.#pathToGoal );
    // }

    this.#sprite.draw( ctx, this.#x, this.#y, this.#angle );
  }

}