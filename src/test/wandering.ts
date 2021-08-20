import { Actor } from '../Actor.js';
import * as Resources from '../Resources.js';
import { World } from '../World.js';
import { GameCanvas, Keyboard, Mouse } from '../GameCanvas.js';
import { PathfindingNode } from '../Pathfinding.js';

const COLS = 10, ROWS = 10;
const isPassableMap = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 
  1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 
  1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 
  1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 
  1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 
  1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 
  1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 
  1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 
  1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 
].map( e => e == 1 );
const testNodes = PathfindingNode.generateNodes( COLS, ROWS, isPassableMap, 32 );

const world = new World();
world.nodeList = testNodes.filter( e => e != null );

for ( let i = 0; i < 5; i ++ ) {
  const enemy = new Actor( await Resources.getEnemySprite() );
  enemy.spawnAtNode( world.getRandomNode() );
  world.actors.push( enemy );
}

const gameCanvas = new GameCanvas( 320, 320 );
document.body.appendChild( gameCanvas.getCanvas() );

gameCanvas.update = ( dt ) => {
  world.update( dt );
}
gameCanvas.draw = ( ctx ) => {
  PathfindingNode.drawNodes( ctx, world.nodeList );
  world.draw( ctx );
}
