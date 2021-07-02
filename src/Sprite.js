import { ImageResource } from './ImageResource.js';

export const Direction = {
  North: 0, West: 1, South: 2, East: 3
};

export class Sprite {
  #width;
  #height;
  #centerX;
  #centerY;
  #actions;

  get width() { return this.#width; }
  get height() { return this.#height; }
  get actions() { return this.#actions; }
  
  constructor({width, height, src, actions}) {
    this.#width = width;
    this.#height = height;
    this.#actions = actions;

    this.ready = new Promise((resolve, reject) => {
      const res = new ImageResource(src);
      res.ready.then(() => {
        const sheet = res.getColorizedImage('lightblue');

        const maxFrames = sheet.width / height;

        this.images = [];

        var y = 0;
        actions.forEach(action => {
          this.images[action] = [];

          for (var dir = 0; dir < 4; dir ++) {
            this.images[action][dir] = [];

            for (var x = 0; x < sheet.width; x += width) {
              const image = this.#extractImage(sheet, x, y);

              if (isCanvasBlank(image)) {
                break;
              }
              
              this.images[action][dir].push(image);
            }

            y += height;
          }
        });

        resolve();
      });
    });
  }

  #extractImage(src, x, y) {
    const w = this.#width, h = this.#height;
    const image = document.createElement('canvas');
    image.width = this.#width;
    image.height = this.#height;
    const ctx = image.getContext('2d');
  
    ctx.drawImage(src, x, y, w, h, 0, 0, w, h);
    return image;
  }
}

// See https://stackoverflow.com/questions/17386707/how-to-check-if-a-canvas-is-blank
function isCanvasBlank(canvas) {
  const context = canvas.getContext('2d');

  const pixelBuffer = new Uint32Array(
    context.getImageData(0, 0, canvas.width, canvas.height).data.buffer
  );

  return !pixelBuffer.some(color => color !== 0);
}
