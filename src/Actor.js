const TIME_BETWEEN_FRAMES = 100;

import { Direction } from '../src/Sprite.js';
import { Node } from '../src/Pathfinding.js';

export class Actor {
  #x = 0;
  #y = 0;
  #angle = Math.PI / 2;   // aim south by default (facing the screen)
  #speed = 0.1;
  #centerX = 0;
  #centerY = 0;

  #sprites;
  #actionFrames;

  #action = 'walk';

  #currentNode = null;
  #goalNode = null;
  #pathToGoal = null;

  #frame = 0;
  #timeUntilNextFrame = TIME_BETWEEN_FRAMES;

  constructor({centerX, centerY, sprites, actionFrames: actionFrames}) {
    this.#centerX = centerX;
    this.#centerY = centerY;
    this.#sprites = sprites;
    this.#actionFrames = actionFrames;
  }

  get x() { return this.#x; }
  get y() { return this.#y; }

  get action() { return this.#action; }
  set action(action) {
    this.#action = action;
    this.#frame = 0;
  }
  
  get pathfindingNode() { return this.#currentNode; }

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
        this.#angle = Math.atan2(waypoint.y - this.#y, waypoint.x - this.#x);
        this.#x += Math.cos(this.#angle) * dist;
        this.#y += Math.sin(this.#angle) * dist;

        this.#updateFrame(dt);
      }      
    }
  }

  #updateFrame(dt) {
    this.#timeUntilNextFrame -= dt;
    if (this.#timeUntilNextFrame < 0) {
      this.#timeUntilNextFrame += TIME_BETWEEN_FRAMES;

      if (++this.#frame >= this.#actionFrames[this.#action]) {
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
    ctx.save();
    ctx.translate(this.#x - this.#centerX, this.#y - this.#centerY);

    const dir = directionFromAngle(this.#angle);
    this.#sprites.forEach(sprite => sprite.draw(ctx, this.#action, dir, this.#frame));

    ctx.restore();
  }
}

function directionFromAngle(angle) {
  if (angle < (-3/4) * Math.PI)  return Direction.West;
  if (angle < (-1/4) * Math.PI)  return Direction.North;
  if (angle < ( 1/4) * Math.PI)  return Direction.East;
  if (angle < ( 3/4) * Math.PI)  return Direction.South;

  return Direction.West;
}