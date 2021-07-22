export class GameCanvas {
  canvas;
  #ctx;
  #lastTime;

  update = (dt)  => {};
  draw   = (ctx) => {};

  constructor(width, height) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.#ctx = this.canvas.getContext('2d');

    // this.#canvas.style = "display: block";

    // Disable context menu
    // this.#canvas.oncontextmenu = () => { return false; }

    // Start animation
    requestAnimationFrame((time) => this.animate(time));
  }

  animate(now) {
    this.#lastTime ??= now;   // for first call only
    this.update(now - this.#lastTime);
    this.#lastTime = now;

    this.draw(this.#ctx);
    
    requestAnimationFrame((time) => this.animate(time));
  }
}

export class Keyboard {
  #keys = new Set();

  constructor() {
    window.onkeydown = (e) => this.#keys.add(e.code);
    window.onkeyup   = (e) => this.#keys.delete(e.code);
  }

  isPressed(code) { return this.#keys.has(code); }
}

export class Mouse {
  static Button = { Left: 0, Middle: 1, Right: 2 };

  #x = 0;
  #y = 0;
  #buttons = new Set();
  
  constructor() {
    window.onmousedown = (e) => this.#buttons.add(e.button);
    window.onmouseup   = (e) => this.#buttons.delete(e.button);
    window.onmousemove = (e) => {
      this.#x = e.clientX;
      this.#y = e.clientY;
    };
  }

  get x() { return this.#x; }
  get y() { return this.#y; }

  isPressed(button) { return this.#buttons.has(button) };
}