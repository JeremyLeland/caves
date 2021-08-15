// Not quite sure what this will end up being..."Resources" may not be quite right...

import { Action, AnimationInfo, Sprite } from "./Sprite.js";

export enum HumanoidAttack {
  Cast, Thrust, Slash, Shoot
};

export const HumanoidAttackInfos: Record< HumanoidAttack, AnimationInfo > = {
  [ HumanoidAttack.Cast ]:    { col: 1, row:  0, frames:  6 },
  [ HumanoidAttack.Thrust ]:  { col: 1, row:  4, frames:  7 },
  [ HumanoidAttack.Slash ]:   { col: 1, row: 12, frames:  5 },
  [ HumanoidAttack.Shoot ]:   { col: 1, row: 16, frames: 12 },
};

export const HumanoidAnimationInfos: Record< Action, AnimationInfo> = {
  [ Action.Idle ]:    { col: 0, row: 0, frames: 1 },
  [ Action.Walk ]:    { col: 1, row: 8, frames: 8, loop: true },
  [ Action.Attack ]:  HumanoidAttackInfos[ HumanoidAttack.Slash ],
  [ Action.Die ]:     { col: 1, row: 20, frames: 5 },
};

const HumanoidImagePath = '../images/sprites/humanoid/male/';

export const HeroImagePaths = [
  'shadow', 'body', 'chest', 'pants', 'hair', 'hat', 'belt', 'shoes', 'dagger'
].map( e => `${ HumanoidImagePath }${ e }.png` );

export async function getHeroSprite() {
  const images = await loadImages( HeroImagePaths );

  return new Sprite( images, HumanoidAnimationInfos );
}

export const EnemyImagePaths = [
  'shadow', 'skeleton', 'axe'
].map( e => `${ HumanoidImagePath }${ e }.png` );

export async function getEnemySprite() {
  const images = await loadImages( EnemyImagePaths );
  return new Sprite( images, HumanoidAnimationInfos );
}


export async function loadImages( paths: Array< string > ) {
  const images = Array.from( paths, path => {
    const image = new Image();
    image.src = path;
    return image;
  });

  await Promise.all( images.map( image => image.decode() ) );

  return images;
}