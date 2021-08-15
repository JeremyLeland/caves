export class GameCanvas {
  #canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;
  #lastTime: number;

  update = ( dt: number ): void => {};
  draw   = ( ctx: CanvasRenderingContext2D ): void => {};

  constructor( width: number, height: number ) {
    this.#canvas = document.createElement( 'canvas' );
    this.#canvas.width = width;
    this.#canvas.height = height;
    this.#ctx = this.#canvas.getContext( '2d' );

    // this.#canvas.style = "display: block";

    // Disable context menu
    // this.#canvas.oncontextmenu = () => { return false; }

    // Start animation
    requestAnimationFrame( ( time ) => this.animate( time ) );
  }

  getCanvas(): HTMLCanvasElement { return this.#canvas; }

  animate( now: number ) {
    this.#lastTime ??= now;   // for first call only
    this.update( now - this.#lastTime );
    this.#lastTime = now;

    this.#ctx.clearRect( 0, 0, this.#canvas.width, this.#canvas.height );
    this.draw( this.#ctx );

    requestAnimationFrame( ( time ) => this.animate( time ) );
  }
}

export class Keyboard {
  #keys = new Set< string >();

  constructor() {
    window.onkeydown = ( e: KeyboardEvent ) => this.#keys.add( e.code );
    window.onkeyup   = ( e: KeyboardEvent ) => this.#keys.delete( e.code );
  }

  isPressed( code: string ) { return this.#keys.has( code ); }
}

enum Button { Left, Middle, Right };

export class Mouse {
  static Button = Button;

  #x = 0;
  #y = 0;
  #buttons = new Set< number >();
  
  constructor() {
    window.onmousedown = ( e: MouseEvent ) => this.#buttons.add( e.button );
    window.onmouseup   = ( e: MouseEvent ) => this.#buttons.delete( e.button );
    window.onmousemove = ( e: MouseEvent ) => {
      this.#x = e.clientX;
      this.#y = e.clientY;
    };
  }

  get x() { return this.#x; }
  get y() { return this.#y; }

  isPressed( button: Button ) { return this.#buttons.has( button ) };
}