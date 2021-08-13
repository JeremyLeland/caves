export class World {
  constructor() {
    this.actors = [];
    this.particles = [];
  }

  update( dt ) {
    this.actors.forEach( actor => actor.update( dt, this ) );
    this.particles.forEach( particle => particle.update( dt ) );
    this.particles = this.particles.filter( particle => particle.life > 0 );
  }

  draw( ctx ) {
    this.actors.forEach( actor => actor.draw( ctx ) );
    this.particles.forEach( particle => particle.draw( ctx ) );
  }
}