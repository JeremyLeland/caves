const TIME_BETWEEN_FRAMES = 100;

export class Actor {
  #x = 0;
  #y = 0;

  #sprites;

  #action;
  #direction;

  #frame = 0;
  #timeUntilNextFrame = TIME_BETWEEN_FRAMES;

  constructor(sprites) {
    this.#sprites = sprites;
    this.#action = 'walk';
    this.#direction = 0;
  }

  get action() { return this.#action; }
  set action(action) {
    this.#action = action;
    this.#frame = 0;
  }

  get direction() { return this.#direction; }
  set direction(dir) { this.#direction = dir; }
  

  #updateFrame(dt) {
    this.#timeUntilNextFrame -= dt;
    if (this.#timeUntilNextFrame < 0) {
      this.#timeUntilNextFrame += TIME_BETWEEN_FRAMES;

      if (++this.#frame >= this.#sprites[0].images[this.#action][this.#direction].length) {
        this.#frame = 1;  // frame 0 is idle
      }
    }
  }

  update(dt) {
    this.#updateFrame(dt);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.#x, this.#y);

    this.#sprites.forEach((sprite) => {
      ctx.drawImage(sprite.images[this.#action][this.#direction][this.#frame], 0, 0);
    });

    ctx.restore();
  }
}