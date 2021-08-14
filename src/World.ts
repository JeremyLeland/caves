import { Actor } from "Actor";

export class World {
  actors = new Array< Actor >();
  // particles = new Array< Particle >();

  update( dt: number ) {
    this.actors.forEach( actor => actor.update( dt, this ) );
    // this.particles.forEach( particle => particle.update( dt ) );
    // this.particles = this.particles.filter( particle => particle.life > 0 );
  }

  draw( ctx: CanvasRenderingContext2D ) {
    this.actors.forEach( actor => actor.draw( ctx ) );
    // this.particles.forEach( particle => particle.draw( ctx ) );
  }
}