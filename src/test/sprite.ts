import * as Resources from '../Resources.js';
import { GameCanvas, Mouse } from '../GameCanvas.js';

const sprite = await Resources.getHeroSprite();

const ui = document.createElement( 'div' );

for ( let action in sprite.spriteInfo.actions ) {
  const button = document.createElement( 'button' );
  button.innerText = action;
  button.onclick = () => sprite.setAction( action );
  ui.appendChild( button );
}
document.body.appendChild( ui );

const mouse = new Mouse();
const gameCanvas = new GameCanvas( 90, 90 );
document.body.appendChild( gameCanvas.getCanvas() );

let angle = 0;
gameCanvas.update = ( dt ) => {
  angle = Math.atan2( mouse.y - 64, mouse.x - 32 );
  sprite.update( dt );
}
gameCanvas.draw = ( ctx ) => {
  ctx.clearRect( 0, 0, 90, 90 );
  sprite.draw( ctx, 32, 64, angle );
}