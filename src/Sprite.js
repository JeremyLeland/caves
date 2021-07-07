import { Images } from './Images.js';

export const Direction = {
  North: 0, West: 1, South: 2, East: 3
};

export class Sprite {
  static async loadSprites(paths, actions) {
    const spritePaths = paths.map(e => `../images/sprites/${e}.png`);
    const sprites = Array.from(spritePaths, (path) => 
      new Sprite({width: 64, height: 64, src: path, actions: actions})
    );
    await Promise.all(sprites.map(s => s.ready));

    return sprites;
  }
  
  #width;
  #height;
  #actions;

  get width() { return this.#width; }
  get height() { return this.#height; }
  get actions() { return this.#actions; }
  
  constructor({width, height, src, actions}) {
    this.#width = width;
    this.#height = height;
    this.#actions = actions;

    this.ready = new Promise((resolve, reject) => {
      const sheet = Images.load(src);
      sheet.decode().then(() => {
        this.images = [];

        var y = 0;
        actions.forEach(action => {
          this.images[action] = [];

          for (var dir = 0; dir < 4; dir ++) {
            this.images[action][dir] = [];

            for (var x = 0; x < sheet.width; x += width) {
              const image = document.createElement('canvas');
              [image.width, image.height] = [width, height];
              const ctx = image.getContext('2d');
            
              ctx.drawImage(sheet, x, y, width, height, 0, 0, width, height);

              if (isCanvasBlank(image)) {
                break;
              }
              
              this.images[action][dir].push(image);
            }

            // 'hurt' only has one row (showing south), so repeat it for all dirs
            y = Math.min(y + height, sheet.height - height);
          }
        });

        resolve();
      });
    });
  }
}

// See https://stackoverflow.com/questions/17386707/how-to-check-if-a-canvas-is-blank
function isCanvasBlank(canvas) {
  const pixelBuffer = new Uint32Array(
    canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data.buffer
  );

  return !pixelBuffer.some(color => color !== 0);
}
