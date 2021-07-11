import { Images } from './Images.js';

export const Direction = {
  North: 0, West: 1, South: 2, East: 3
};

export class Sprite {
  static async loadSprites(spriteInfo, actions) {
    const sprites = Array.from(spriteInfo, (info) => 
      new Sprite({width: 64, height: 64, src: info.path, actions: actions, 
        color: info.color, brightness: info.brightness})
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
  
  constructor({width, height, src, actions, color = null, brightness = null}) {
    this.#width = width;
    this.#height = height;
    this.#actions = actions;

    this.ready = new Promise((resolve, reject) => {
      const sheet = Images.load(src);
      sheet.decode().then(() => {
        this.images = [];

        let y = 0;
        for (let action in actions) {
          this.images[action] = [];

          for (let dir = 0; dir < 4; dir ++) {
            this.images[action][dir] = [];

            const numFrames = actions[action];
            for (let frame = 0; frame < numFrames; frame ++) {
              const image = document.createElement('canvas');
              [image.width, image.height] = [width, height];
              const ctx = image.getContext('2d');
            
              ctx.drawImage(sheet, frame * width, y, width, height, 0, 0, width, height);

              if (color != null) {
                ctx.globalCompositeOperation = 'source-in';
                ctx.fillStyle = color;
                ctx.fillRect(0, 0, image.width, image.height);
                
                if (brightness != null) {
                  ctx.filter = `brightness(${brightness})`;
                }
                ctx.globalCompositeOperation = 'luminosity';
                ctx.drawImage(sheet, frame * width, y, width, height, 0, 0, width, height);
              }

              this.images[action][dir].push(image);
            }

            // 'hurt' only has one row (showing south), so repeat it for all dirs
            y = Math.min(y + height, sheet.height - height);
          }
        }

        resolve();
      });
    });
  }
}