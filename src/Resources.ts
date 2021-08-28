// Not quite sure what this will end up being..."Resources" may not be quite right...

import { Sprite, SpriteInfo } from "./Sprite.js";

const spriteInfos = await loadSpriteInfos( '../json/actors.json' );

const heroLayers = [
  'shadow', 'body', 'chest', 'pants', 'hair', 'hat', 'belt', 'shoes', 'dagger'
];

export async function getHeroSprite() {
  return Sprite.fromLayers( heroLayers , spriteInfos[ 'Humanoid' ] );
}

const enemyLayers = [
  'shadow', 'skeleton', 'axe'
];

export async function getEnemySprite() {
  return Sprite.fromLayers( enemyLayers, spriteInfos[ 'Humanoid' ] );
}
 
async function loadSpriteInfos( spriteInfosPath: string ) {
  // TODO: Some error handling here
  const result = await fetch( spriteInfosPath );
  const spriteInfos = await ( result.json() ) as Map< string, SpriteInfo >;

  return spriteInfos;
}