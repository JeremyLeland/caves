export class World {
  constructor() {
    this.actors = [];
    this.particles = [];
  }

  update( dt ) {
    this.actors.forEach( actor => actor.update( dt, this ) );
  }

  draw( ctx ) {
    this.actors.forEach( actor => actor.draw( ctx ) );
  }
}