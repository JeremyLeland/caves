import { TileMap, TileSize } from './tilemap.js';
import { Actor } from './actor.js';

export class Level {
  constructor( json ) {
    this.tileMap = new TileMap( json );

    this.actors = json.actors.map( json => new Actor( json ) );
    this.teams = [];

    this.actors.forEach( actor => { 
      actor.currentNode = this.getNodeAt( actor.x, actor.y )
      if ( !this.teams[ actor.team ] ) {
        this.teams[ actor.team ] = [];
      }
      this.teams[ actor.team ].push( actor );
    } );
  }

  update( dt ) {
    const thePlayer = this.teams[ 'player' ][ 0 ];
    this.teams[ 'enemy' ].forEach( enemy => {
      enemy.target = thePlayer.life > 0 ? thePlayer : null;

      if ( enemy.target ) {
        enemy.setGoalNode( enemy.target.currentNode );
      }
      else if ( enemy.path == null ) {
        enemy.setGoalNode( this.getRandomNode() );
      }

      enemy.update( { others: this.teams[ 'enemy' ], dt: dt } );
    });

    this.teams[ 'player' ].forEach( player => {
      // if ( player.path == null ) {
      //   Actor.setGoalNode( player, getRandomNode() );
      // }

      player.update( { others: this.teams[ 'player' ], dt: dt } );
    });
  }

  // TODO: Move these to tileMap
  getNodeAt( x, y ) {
    const col = Math.floor( x / TileSize );
    const row = Math.floor( y / TileSize );
    return this.tileMap.nodeMap[ col + row * this.tileMap.cols ];
  }

  getRandomNode() {
    return this.tileMap.nodeList[ Math.floor( Math.random() * this.tileMap.nodeList.length ) ];
  }

  setGroundAt( x, y, tileInfoKey ) {
    const col = Math.floor( x / TileSize );
    const row = Math.floor( y / TileSize );

    const index = col + row * this.tileMap.cols;

    // const oldPassable = this.tileMap.cells[ index ].tileInfoKey.passable;
    // const newPassable = 

    this.tileMap.setTileInfoKeyAt( col, row, tileInfoKey );

    // TODO: Update pathfinding nodes
    // const toRemove = this.nodeMap[ col + row * this.tileMap.cols ];
  }
}