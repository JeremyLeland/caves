import { Actor, HumanoidAnimationInfos } from '../../build/Actor.js';
import { Sprite } from '../../build/Sprite.js';
import { World } from '../../build/World.js';
import { GameCanvas, Keyboard, Mouse } from '../../build/GameCanvas.js';

const imagePaths = [
  'body', 'chest', 'pants', 'hair', 'hat', 'belt', 'shoes', 'dagger'
].map( e => `../images/sprites/humanoid/male/${ e }.png` );
const images = await Sprite.loadImages( imagePaths );

const sprite = new Sprite( images, HumanoidAnimationInfos );
const actor = new Actor( sprite );
actor.spawnAtPoint( 32, 64 );

const world = new World();
world.actors.push( actor );

const mouse = new Mouse();
const gameCanvas = new GameCanvas( 300, 300 );
document.body.appendChild( gameCanvas.getCanvas() );

let angle = 0;
gameCanvas.update = ( dt ) => {
  actor.aimTowardPoint( mouse.x, mouse.y );
  world.update( dt );
}
gameCanvas.draw = ( ctx ) => {
  ctx.clearRect( 0, 0, 300, 300 );
  world.draw( ctx );
}