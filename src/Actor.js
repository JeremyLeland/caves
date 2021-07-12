const TIME_BETWEEN_FRAMES = 100;

export class Actor {
  #x = 0;
  #y = 0;
  #centerX = 0;
  #centerY = 0;

  #sprites;
  #actionFrames;

  #action;
  #direction;

  #frame = 0;
  #timeUntilNextFrame = TIME_BETWEEN_FRAMES;

  constructor({centerX, centerY, sprites, actionFrames: actionFrames}) {
    this.#centerX = centerX;
    this.#centerY = centerY;
    this.#sprites = sprites;
    this.#actionFrames = actionFrames;

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
  
  spawn(x, y) {
    this.#x = x;
    this.#y = y;
  }

  #updateFrame(dt) {
    this.#timeUntilNextFrame -= dt;
    if (this.#timeUntilNextFrame < 0) {
      this.#timeUntilNextFrame += TIME_BETWEEN_FRAMES;

      if (++this.#frame >= this.#actionFrames[this.#action]) {
        this.#frame = 1;  // frame 0 is idle
      }
    }
  }

  update(dt) {
    this.#updateFrame(dt);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.#x - this.#centerX, this.#y - this.#centerY);

    this.#sprites.forEach(sprite => sprite.draw(ctx, this.#action, this.#direction, this.#frame));

    ctx.restore();
  }
}