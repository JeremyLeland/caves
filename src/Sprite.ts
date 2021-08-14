
export enum Direction {
  North, West, South, East
};

export enum Action {
  Idle, Walk, Attack, Die
};

export interface AnimationInfo {
  col: number;
  row: number;
  frames: number;
  loop?: boolean;
};

const WIDTH = 64, HEIGHT = 64;
const CENTER_X = 31, CENTER_Y = 60;
const TIME_BETWEEN_FRAMES = 100;

export class Sprite {
  #spriteSheet : HTMLCanvasElement;
  #action : Action;
  #animationInfos : Record< Action, AnimationInfo >;
  #frame = 0;
  #frameTimer = TIME_BETWEEN_FRAMES;

  constructor( layers: Array< HTMLImageElement >, animationInfos: Record< Action, AnimationInfo > ) {
    this.#spriteSheet = getCombinedSpriteSheet( layers );
    this.#animationInfos = animationInfos;

    this.startAction( Action.Idle );
  }

  startAction( action: Action ) {
    if ( this.#action != action ) {
      this.#action = action;
      this.#frame = 0;
      this.#frameTimer = TIME_BETWEEN_FRAMES;
    }
  }

  update( dt: number ) {
    this.#frameTimer -= dt;
    
    if (this.#frameTimer < 0) {
      const animInfo = this.#animationInfos[ this.#action ];

      this.#frameTimer += TIME_BETWEEN_FRAMES;
      this.#frame = ( this.#frame + 1 ) % animInfo.frames;

      if ( this.#frame == 0 && animInfo.loop != true ) {
        this.startAction( Action.Idle );
      }
    }
  }

  draw( ctx: CanvasRenderingContext2D, x: number, y: number, angle: number ) {
    const animInfo = this.#animationInfos[ this.#action ];

    const sheetX = WIDTH * ( animInfo.col + this.#frame );
    const sheetY = HEIGHT * ( animInfo.row +
      ( this.#action == Action.Die ? 0 : directionFromAngle( angle ) ) ); // Die only has one direction

    const destX = Math.floor( x - CENTER_X );
    const destY = Math.floor( y - CENTER_Y );

    ctx.drawImage( this.#spriteSheet, sheetX, sheetY, WIDTH, HEIGHT, destX, destY, WIDTH, HEIGHT );
  }

  // TODO: Move this somewhere more general (a Resources class?)
  static async loadImages( paths: Array< string > ) {
    const images = Array.from( paths, path => {
      const image = new Image();
      image.src = path;
      return image;
    });

    await Promise.all( images.map( image => image.decode() ) );

    return images;
  }
}

function getCombinedSpriteSheet( layers: Array< HTMLImageElement > ): HTMLCanvasElement {
  const canvas = document.createElement( 'canvas' ) as HTMLCanvasElement;
  canvas.width = layers[ 0 ].width;
  canvas.height = layers[ 0 ].height;
  const ctx = canvas.getContext( '2d' );

  layers.forEach( layer => ctx.drawImage( layer, 0, 0 ) );

  return canvas;
}

function directionFromAngle( angle: number ): Direction {
  if (angle < (-3/4) * Math.PI)  return Direction.West;
  if (angle < (-1/4) * Math.PI)  return Direction.North;
  if (angle < ( 1/4) * Math.PI)  return Direction.East;
  if (angle < ( 3/4) * Math.PI)  return Direction.South;

  return Direction.West;
}