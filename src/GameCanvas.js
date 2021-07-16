export class GameCanvas {
  #canvas;
  #ctx;
  #scrollX = 0;
  #scrollY = 0;
  #maxScrollX = 0;
  #maxScrollY = 0;
  #lastTime;

  update = (dt)  => {};
  draw   = (ctx) => {};

  constructor(canvas, {fullscreen = true} = {}) {
    this.#canvas = canvas;
    this.#ctx = canvas.getContext('2d');

    // Resize with window
    if (fullscreen) {
      window.onresize = () => {
        this.#canvas.width = window.innerWidth;
        this.#canvas.height = window.innerHeight;
      }
      window.onresize();
    }

    this.#canvas.style = "display: block";

    // Disable context menu
    this.#canvas.oncontextmenu = () => { return false; }

    // Start animation
    requestAnimationFrame((time) => this.animate(time));
  }

  get scrollX() { return this.#scrollX; }
  get scrollY() { return this.#scrollY; }

  scrollBy(dx, dy) {
    this.#scrollX += dx;
    this.#scrollY += dy;

    this.#scrollX = Math.max(0, Math.min(this.#maxScrollX - this.#canvas.width, this.scrollX));
    this.#scrollY = Math.max(0, Math.min(this.#maxScrollY - this.#canvas.height, this.scrollY));
  }

  scrollTo(x, y) {
    this.#scrollX = x - this.#canvas.width / 2;
    this.#scrollY = y - this.#canvas.height / 2;

    this.#scrollX = Math.max(0, Math.min(this.#maxScrollX - this.#canvas.width, this.scrollX));
    this.#scrollY = Math.max(0, Math.min(this.#maxScrollY - this.#canvas.height, this.scrollY));
  }

  setScrollArea(width, height) {
    this.#maxScrollX = width;
    this.#maxScrollY = height;
  }

  animate(now) {
    this.#lastTime ??= now;   // for first call only
    this.update(now - this.#lastTime);
    this.#lastTime = now;

    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    this.#ctx.save();
    this.#ctx.translate(Math.floor(-this.#scrollX), Math.floor(-this.#scrollY));
    this.draw(this.#ctx);
    this.#ctx.restore();
    
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
    window.onmousemove = (e) => [ this.#x, this.#y ] = [ e.clientX, e.clientY ];
  }

  get x() { return this.#x; }
  get y() { return this.#y; }

  isPressed(button) { return this.#buttons.has(button) };
}