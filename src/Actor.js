import { Node } from '../src/Pathfinding.js';

export const Direction = {
  North: 0, West: 1, South: 2, East: 3
};
export const Action = {
  Idle: 0, Walk: 1, Attack: 2, Die: 3
}

const TIME_BETWEEN_FRAMES = 100;

const HumanoidActionInfo = {
  [Action.Idle]: { col: 0, row: 0, frames: 0 },
  [Action.Walk]: { col: 1, row: 8, frames: 8 },
  [Action.Attack]: {
    Cast:   { col: 1, row:  0, frames:  6 },
    Thrust: { col: 1, row:  4, frames:  7 },
    Slash:  { col: 1, row: 12, frames:  5 },
    Shoot:  { col: 1, row: 16, frames: 12 },
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

  #sprites;

  #action = Action.Idle;
  #actionInfo = HumanoidActionInfo[Action.Idle];

  #currentNode = null;
  #goalNode = null;
  #pathToGoal = null;
  #waypoint = null;

  #target = null;

  #frame = 0;
  #timeUntilNextFrame = 0;

  constructor(sprites) {
    this.#sprites = sprites;
  }

  get x() { return this.#x; }
  get y() { return this.#y; }

  startAction(action) {
    if (this.#action != action) {
      this.#action = action;
      // TODO: figure out our actual attack action, don't just hardcode Slash
      this.#actionInfo = action == Action.Attack ? 
        HumanoidActionInfo[Action.Attack].Slash : HumanoidActionInfo[action];
  
      this.#timeUntilNextFrame = TIME_BETWEEN_FRAMES;
      this.#frame = 0;
    }
  }
  
  getEmptyNearbyNode() {
    const emptyNearbyNodes = [...this.#currentNode.linkedNodes].filter( node => node.occupants.size == 0 );
    return emptyNearbyNodes[ Math.floor( Math.random() * emptyNearbyNodes.length ) ];
  }

  setCurrentNode( node ) {
    this.#currentNode?.occupants?.delete( this );
    this.#currentNode = node;
    this.#currentNode.occupants.add( this );
  }

  spawnAtPoint(x, y) {
    this.#x = x;
    this.#y = y;
  }

  aimTowardActor(actor) {
    this.aimTowardPoint(actor.x, actor.y);
  }

  aimTowardPoint(x, y) {
    this.#angle = Math.atan2(y - this.#y, x - this.#x);
  }

  spawnAtNode(node) {
    this.#x = node.x;
    this.#y = node.y;
    this.setCurrentNode( node );
  }

  setTarget(target) {
    this.#target = target;
  }

  setGoal(node) {
    this.#goalNode = node;
  }

  #getNextWaypoint() {
    this.#goalNode = this.#target?.getEmptyNearbyNode() ?? this.#goalNode;

    const pathToGoal = Node.A_Star( this.#currentNode, this.#goalNode );
    pathToGoal?.shift();   // ignore first waypoint, since we're already there
    return pathToGoal?.shift();
  }

  distanceFromActor(actor) {
    return actor == null ? Infinity : this.distanceFromPoint(actor.x, actor.y);
  }

  distanceFromPoint(x, y) {
    return Math.hypot( x - this.#x, y - this.#y );
  }

  #moveTowardGoal(dt) {    
    if (this.#waypoint == null) {
      this.#waypoint = this.#getNextWaypoint();
    }

    if (this.#waypoint != null) {
      const dist = this.#speed * dt;

      if (this.distanceFromPoint(this.#waypoint.x, this.#waypoint.y) < dist) {
        this.setCurrentNode( this.#waypoint );
        this.#waypoint = this.#getNextWaypoint();
      }

      if (this.#waypoint == null) {
        this.#x = this.#goalNode.x;
        this.#y = this.#goalNode.y;
        this.#goalNode = null;
        this.#pathToGoal = null;
        
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
    this.#timeUntilNextFrame -= dt;

    if (this.#timeUntilNextFrame < 0) {
      this.#timeUntilNextFrame += TIME_BETWEEN_FRAMES;

      if (++this.#frame >= this.#actionInfo.frames) {
        switch (this.#action) {
          case Action.Idle: case Action.Walk:
            this.#frame = 0;  // keep doing what we're doing
            break;
          case Action.Attack:
            this.startAction(Action.Idle);  // only attack once
            break;
          case Action.Die:
            this.#frame --;   // keep last die frame
            break; 
        }
      }
    }
  }

  think(tileMap) {
    if (this.#pathToGoal == null) { 
      this.setGoal(tileMap.getRandomNode());
    }
  }

  update(dt) {
    if (this.distanceFromActor(this.#target) < 50) {
      this.aimTowardActor(this.#target);
      this.startAction(Action.Attack);
    }
    else {
      this.#moveTowardGoal(dt);
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
