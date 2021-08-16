import { Actor } from '../Actor.js';
import * as Resources from '../../build/Resources.js';
import { World } from '../World.js';
import { GameCanvas, Keyboard, Mouse } from '../../build/GameCanvas.js';
import { generateTestNodes } from './pathfinding.js';
import { Node } from '../../build/Pathfinding.js';

const COLS = 10, ROWS = 10;
const testNodes = generateTestNodes( COLS, ROWS, 32 );

const world = new World();
world.nodeList = testNodes.list;

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
  Node.drawNodes( ctx, testNodes.list );
  world.draw( ctx );
}
