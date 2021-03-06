import { World } from "World";
import { Sprite } from './Sprite.js';
import { PathfindingNode } from './Pathfinding.js';
import { TileMap } from "./TileMap.js";
// import { TextParticle } from './Particles.js';

enum State {
  Idle, Move, Attack
};

const TIME_BETWEEN_ATTACKS = 1000;
const TIME_BETWEEN_WANDERS = 5000;
const TIME_BETWEEN_THINKS  = 100;

export class Actor {
  #x = 0;
  #y = 0;
  #angle = Math.PI / 2;   // aim south by default (facing the screen)
  #speed = 0.1;
  #life = 100;

  #sprite: Sprite;

  #state = State.Idle;

  // #target = null;
  goalNode : PathfindingNode = null;
  #currentNode: PathfindingNode = null;
  #pathToGoal : Array< PathfindingNode > = null;
  // #waypoint = null;
  closestOther : Actor;
  closestOtherDist: number;

  #timers = { attack: 0, wander: 0, think: 0 };

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

  spawnAtNode( node: PathfindingNode ) {
    this.#x = node.x;
    this.#y = node.y;
    this.#currentNode = node;
  }

  //
  // Distances and angles
  //
  distanceFromActor( actor: Actor ): number {
    return actor == null ? Infinity : this.distanceFromPoint( actor.x, actor.y );
  }

  distanceFromGoal(): number {
    return this.goalNode == null ? Infinity : this.distanceFromPoint( this.goalNode.x, this.goalNode.y );
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
      const lastPathNode = this.#pathToGoal?.[ this.#pathToGoal?.length - 1];
      if ( lastPathNode != this.goalNode ) {
        this.#pathToGoal = PathfindingNode.A_Star( this.#currentNode, this.goalNode );
        // TODO: shift() first entry? We used to do this...
      }

      return this.#pathToGoal?.[ 0 ];
    }

    return null;
  }

  #doThink( tileMap: TileMap ) {

    if ( this.#timers.wander < 0 ) {
      this.#timers.wander += TIME_BETWEEN_WANDERS;
      this.goalNode = tileMap.getRandomNode();
    }

    // TODO: Attacking instead of moving
    //this.goalNode ??= tileMap.getRandomNode();
    this.#state = State.Move;

    // const toGoalX = this.goalNode.x - this.#x;
    // const toGoalY = this.goalNode.y - this.#y;
    // const distToGoal = Math.hypot( toGoalX, toGoalY );
    // const normToGoalX = toGoalX / distToGoal;
    // const normToGoalY = toGoalY / distToGoal;

    // TODO: Filter out target, when we have one
    this.closestOther = null;
    this.closestOtherDist = Infinity;
    tileMap.actors.filter( other => other != this ).forEach( other => {
      const dist = ( other.#x - this.#x ) * Math.cos( this.#angle ) + ( other.#y - this.#y ) * Math.sin( this.#angle );
      //const dist = this.distanceFromActor( other );
      if ( dist < this.closestOtherDist ) {
        this.closestOther = other;
        this.closestOtherDist = dist;
      }
    }); 

    // TODO: This doesn't seem to actually work, come back to this
    // If two Actors are near each other, whoever is closest to their goal should
    // go first to clear the way
    if ( 0 < this.closestOtherDist && this.closestOtherDist < 50 /*&&
        this.#closestOther.distanceFromGoal() < this.distanceFromGoal() */ ) {  
      this.#state = State.Idle;
      console.log( 'Waiting for other...' );
    }
  }

  #doIdle( dt: number ) {

  }

  #doAttack( dt: number ) {

  }

  #doMove( dt: number ) {
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
      }
      else {
        this.goalNode = null;
        this.#state = State.Idle;
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
      this.#sprite.setAction( 'die' );
    }
  }

  update( dt: number, tileMap: TileMap ) {
    this.#sprite.update( dt );

    for ( let timer in this.#timers ) {
      this.#timers[ timer ] -= dt;
    }

    if ( this.#timers.think < 0 ) {
      this.#timers.think += TIME_BETWEEN_THINKS;
      this.#doThink( tileMap );
    }

    switch ( this.#state ) {
      case State.Idle:
        this.#sprite.setAction( 'idle' );
        this.#doIdle( dt );
        break;

      case State.Attack:
        this.#doAttack( dt );
        break;

      case State.Move:
        this.#sprite.setAction( 'walk' );
        this.#doMove( dt );
        break;
    }


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
      
    // }
  }

  draw( ctx: CanvasRenderingContext2D ) {
    if ( this.#pathToGoal != null ) {
      PathfindingNode.drawPath( ctx, this.#pathToGoal );
    }

    if ( this.closestOther != null ) {
      ctx.beginPath();
      ctx.moveTo( this.#x, this.#y );
      ctx.lineTo( this.closestOther.#x, this.closestOther.#y );

      ctx.strokeStyle = 0 < this.closestOtherDist && this.closestOtherDist < 50 ? 'red' : 'green';
      ctx.stroke();

      ctx.fillStyle = 'white';
      ctx.fillText( `${ this.closestOtherDist.toFixed( 2 ) }`, this.#x, this.#y + 20 );
    }

    this.#sprite.draw( ctx, this.#x, this.#y, this.#angle );
  }

}
