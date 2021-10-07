import { TileMap, TileSize } from './tilemap.js';
import { Actor } from './actor.js';

export class Level {
  constructor( json ) {
    this.tileMap = new TileMap( json );

    this.heros = [];
    this.enemies = [];

    // TODO: Better to reuse existing actor object, or make a new one?
    // How do we restore this when done previewing game in editor?
    this.tileMap.cells.forEach( cell => {
      if ( cell.actor ) {
        const actor = new Actor( cell.actor.actorInfoKey, cell.x, cell.y );
        actor.currentCell = cell;

        // TODO: How will this get added back when editor is done testing a level?
        cell.cellDiv.removeChild( cell.actor.spriteDiv );

        this.tileMap.levelDiv.append( actor.spriteDiv );
        this.tileMap.pathfindingSVG.appendChild( actor.pathSVG );

        if ( actor.actorInfoKey == 'hero' ) {
          this.heros.push( actor );
        }
        else {
          this.enemies.push( actor );
        }
      }
    } );
  }

  update( dt ) {
    this.enemies.forEach( enemy => {
      // enemy.target = this.heros.length > 0 ? this.heros[ 0 ] : null;

      // if ( enemy.target ) {
      //   enemy.setGoalCell( enemy.target.currentCell );
      // }
      // else if ( enemy.path == null ) {
      //   // TODO: Do this in actor instead?
      //   const neighbors = [ ...enemy.currentCell.neighbors.values() ];
      //   const goal = neighbors[ Math.floor( Math.random() * neighbors.length ) ];
      //   enemy.setGoalCell( goal );
      // }

      enemy.update( { allies: this.enemies, enemies: this.heros, dt: dt } );
    });

    this.enemies = this.enemies.filter( e => e.life > 0 );

    this.heros.forEach( player => {
      // if ( player.path == null ) {
      //   Actor.setGoalNode( player, getRandomNode() );
      // }

      player.update( { allies: this.heros, enemies: this.enemies, dt: dt } );
    });

    this.heros = this.heros.filter( e => e.life > 0 );
  }
}