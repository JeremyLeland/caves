
export interface SpriteInfo {
  width: number;
  height: number;
  center?: Array< number >;
  centers?: Array< Array< number > >;
  imagesPath: string;
  dirIndex: Map< string, number >;
  actions: Map< string, AnimationInfo >;
};

export interface AnimationInfo {
  col: number;
  row: number;
  frames: number;
  loop?: boolean;
};

const TIME_BETWEEN_FRAMES = 100;

export class Sprite {
  #spriteSheet : HTMLCanvasElement;
  readonly spriteInfo : SpriteInfo;

  #action: string;
  #frame = 0;
  #frameTimer = TIME_BETWEEN_FRAMES;

  static async fromLayers( layers: Array< string >, spriteInfo: SpriteInfo ) {
    const layerPaths = layers.map( e => `${spriteInfo.imagesPath}/${e}.png` );

    const images = Array.from( layerPaths, path => {
      const image = new Image();
      image.src = path;
      return image;
    });

    await Promise.all( images.map( image => image.decode() ) );
    const spriteSheet = getCombinedSpriteSheet( images );

    return new Sprite( spriteSheet, spriteInfo );
  }

  constructor( spriteSheet: HTMLCanvasElement, spriteInfo: SpriteInfo ) {
    this.#spriteSheet = spriteSheet;
    this.spriteInfo = spriteInfo;

    this.setAction( 'idle' );
  }

  setAction( action: string ) {
    if ( this.#action != action ) {
      this.#action = action;
      this.#frame = 0;
      this.#frameTimer = TIME_BETWEEN_FRAMES;
    }
  }

  update( dt: number ) {
    this.#frameTimer -= dt;
    
    if (this.#frameTimer < 0) {
      const animInfo = this.spriteInfo.actions[ this.#action ];

      this.#frameTimer += TIME_BETWEEN_FRAMES;
      this.#frame = ( this.#frame + 1 ) % animInfo.frames;

      if ( this.#frame == 0 && animInfo.loop != true ) {
        this.setAction( 'idle' );
      }
    }
  }

  draw( ctx: CanvasRenderingContext2D, x: number, y: number, angle: number ) {
    const animInfo = this.spriteInfo.actions[ this.#action ];

    const dir = this.spriteInfo.dirIndex[ directionFromAngle( angle ) ];

    const w = this.spriteInfo.width, h = this.spriteInfo.height;

    const sheetX = w * ( animInfo.col + this.#frame );
    const sheetY = h * ( animInfo.row + ( this.#action == 'die' ? 0 : dir ) );

    const center = this.spriteInfo.center ?? this.spriteInfo.centers[ dir ];
    const destX = Math.floor( x - center[ 0 ] );
    const destY = Math.floor( y - center[ 1 ] );

    ctx.drawImage( this.#spriteSheet, sheetX, sheetY, w, h, destX, destY, w, h );
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

function directionFromAngle( angle: number ): string {
  if (angle < (-3/4) * Math.PI)  return 'west';
  if (angle < (-1/4) * Math.PI)  return 'north';
  if (angle < ( 1/4) * Math.PI)  return 'east';
  if (angle < ( 3/4) * Math.PI)  return 'south';

  return 'west';
}