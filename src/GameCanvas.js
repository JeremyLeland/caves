export class GameCanvas {
  #canvas;
  #ctx;
  #scrollX = 0;
  #scrollY = 0;
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
    this.#lastTime = Date.now();
    requestAnimationFrame((time) => this.animate(time));
  }

  get scrollX() { return this.#scrollX; }
  get scrollY() { return this.#scrollY; }

  scrollBy(dx, dy) {
    this.#scrollX += dx;
    this.#scrollY += dy;
  }

  scrollTo(x, y) {
    this.#scrollX = x - this.#canvas.width / 2;
    this.#scrollY = y - this.#canvas.height / 2;
  }

  animate(now) {
    this.update(now - this.#lastTime);
    this.#lastTime = now;

    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    this.#ctx.save();
    this.#ctx.translate(-this.#scrollX, -this.#scrollY);
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
    window.onmousemove = (e) => {
      [ this.#x, this.#y ] = [ e.offsetX, e.offsetY ];
    } 
  }

  get x() { return this.#x; }
  get y() { return this.#y; }

  isPressed(button) { this.#buttons.has(button) };
}