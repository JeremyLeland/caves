import { Actor } from '../../build/Actor.js';
import * as Resources from '../../build/Resources.js';
import { World } from '../../build/World.js';
import { GameCanvas, Keyboard, Mouse } from '../../build/GameCanvas.js';

const hero = new Actor( await Resources.getHeroSprite() );
hero.spawnAtPoint( 32, 64 );

const enemy = new Actor( await Resources.getEnemySprite() );
enemy.spawnAtPoint( 64, 64 );

const world = new World();
world.actors.push( hero );
world.actors.push( enemy );

const mouse = new Mouse();
const gameCanvas = new GameCanvas( 300, 300 );
document.body.appendChild( gameCanvas.getCanvas() );

gameCanvas.update = ( dt ) => {
  world.actors.forEach( actor => actor.aimTowardPoint( mouse.x, mouse.y ) );
  world.update( dt );
}
gameCanvas.draw = ( ctx ) => {
  ctx.clearRect( 0, 0, 300, 300 );
  world.draw( ctx );
}