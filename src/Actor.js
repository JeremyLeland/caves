import { Node } from '../src/Pathfinding.js';

export const Direction = {
  North: 0, West: 1, South: 2, East: 3
};
export const Action = {
  Cast: 0, Thrust: 1, Walk: 2, Slash: 3, Shoot: 4, Hurt: 5
}

const TIME_BETWEEN_FRAMES = 100;

// For now, just use the standard LPC sprites and hardcode everything
// Revisit this later if we want more variety
const ACTION_FRAMES = {
  [Action.Cast]: 7,
  [Action.Thrust]: 8,
  [Action.Walk]: 9,
  [Action.Slash]: 6,
  [Action.Shoot]: 13,
  [Action.Hurt]: 6
};
const WIDTH = 64, HEIGHT = 64;
const CENTER_X = 31, CENTER_Y = 60;

export class Actor {
  #x = 0;
  #y = 0;
  #angle = Math.PI / 2;   // aim south by default (facing the screen)
  #speed = 0.1;

  #sprites;

  #action = Action.Walk;

  #currentNode = null;
  #goalNode = null;
  #pathToGoal = null;

  #frame = 0;
  #timeUntilNextFrame = TIME_BETWEEN_FRAMES;

  constructor(sprites) {
    this.#sprites = sprites;
  }

  get x() { return this.#x; }
  get y() { return this.#y; }

  get action() { return this.#action; }
  set action(action) {
    this.#action = action;
    this.#frame = 0;
  }
  
  get pathfindingNode() { return this.#currentNode; }

  spawnAtPoint(x, y) {
    this.#x = x;
    this.#y = y;
  }

  aimTowardPoint(x, y) {
    this.#angle = Math.atan2(y - this.#y, x - this.#x);
  }

  spawnAtNode(node) {
    this.#x = node.x;
    this.#y = node.y;
    this.#currentNode = node;
  }

  setGoal(node) {
    this.#goalNode = node;
    this.#pathToGoal = Node.A_Star(this.#currentNode, this.#goalNode);

    if (this.#pathToGoal != null) {
      this.#pathToGoal.shift();   // we can ignore first value, since this is our current node
    }
  }

  distanceFromPoint(x, y) {
    return Math.sqrt(Math.pow(x - this.#x, 2) + Math.pow(y - this.#y, 2));
  }

  #getNextWaypoint(dt) {
    if (this.#pathToGoal != null && this.#pathToGoal.length > 0) {
      let waypoint = this.#pathToGoal[0];

      if (this.distanceFromPoint(waypoint.x, waypoint.y) < this.#speed * dt) {
        // We've reached the waypoint -- update our current node
        this.#currentNode = this.#pathToGoal.shift();
        if (this.#pathToGoal.length > 0) {
          waypoint = this.#pathToGoal[0];
        }
        else {
          this.#pathToGoal = null;
        }
      }

      return waypoint;
    }

    return null;
  }

  #moveTowardGoal(dt) {
    const waypoint = this.#getNextWaypoint(dt);
    
    if (waypoint != null) {
      const dist = this.#speed * dt;
      if (this.distanceFromPoint(waypoint.x, waypoint.y) < dist) {
        this.#x = waypoint.x;
        this.#y = waypoint.y;
        this.#frame = 0;
      }
      else {
        this.aimTowardPoint(waypoint.x, waypoint.y);
        this.#x += Math.cos(this.#angle) * dist;
        this.#y += Math.sin(this.#angle) * dist;

        this.updateFrame(dt);
      }      
    }
  }

  updateFrame(dt) {
    this.#timeUntilNextFrame -= dt;
    if (this.#timeUntilNextFrame < 0) {
      this.#timeUntilNextFrame += TIME_BETWEEN_FRAMES;

      if (++this.#frame >= ACTION_FRAMES[this.#action]) {
        this.#frame = 1;  // frame 0 is idle
      }
    }
  }

  think(tileMap) {
    if (this.#pathToGoal == null) {
      this.setGoal(tileMap.getRandomNode());
    }
  }

  update(dt) {
    this.#moveTowardGoal(dt);
  }

  draw(ctx) {
    const sheetX = WIDTH * this.#frame;
    const sheetY = HEIGHT * (this.#action * 4 + 
      (this.#action != Action.Hurt ? directionFromAngle(this.#angle) : 0)); // Hurt only goes one direction
    
    const destX = this.#x - CENTER_X;
    const destY = this.#y - CENTER_Y;
    
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