import { Images } from './Images.js';

export const Direction = {
  North: 0, West: 1, South: 2, East: 3
};

export class Sprite {
  static async loadSprites(paths, actionFrames) {
    const imagePaths = paths.map(e => `../images/sprites/${e}.png`);
    const images = await Images.loadImages(imagePaths);
    return Array.from(images, image => 
      new Sprite({width: 64, height: 64, src: image, actionFrames: actionFrames})
    );
  }
  
  #width;
  #height;
  #sheet;
  #coords;

  get width() { return this.#width; }
  get height() { return this.#height; }
  
  constructor({width, height, src, actionFrames: actionFrames}) {
    this.#width = width;
    this.#height = height;
    this.#sheet = src;
    this.#coords = [];

    let y = 0;
    for (let action in actionFrames) {
      this.#coords[action] = [];

      for (let dir = 0; dir < 4; dir ++) {
        this.#coords[action][dir] = [];

        const numFrames = actionFrames[action];
        for (let frame = 0; frame < numFrames; frame ++) {
          this.#coords[action][dir].push([frame * width, y]);
        }

        // 'hurt' only has one row (showing south), so repeat it for all dirs
        if (action != 'hurt') {
          y += height;
        }
      }
    }
  }

  draw(ctx, action, dir, frame) {
    const [x, y] = this.#coords[action][dir][frame];
    ctx.drawImage(this.#sheet, x, y, this.#width, this.#height, 0, 0, this.#width, this.#height);
  }
}