import { TileMap, TileSize } from './tilemap.js';
import * as Prop from './prop.js';
import { Actor } from './actor.js';

import * as Pathfinding from './pathfinding.js';

export class Level {
  constructor( json ) {
    this.tileMap = new TileMap( json.ground );

    const passableMap = this.tileMap.getPassableMap( );
    json.props.forEach( propJson => {
      const propInfo = Prop.fromJson( propJson );
      const index = propJson.col + propJson.row * json.ground.cols;
      const passable = propInfo.passable;
      passableMap[ index ] = passable;
    } );

    this.nodeMap = Pathfinding.getNodeMap( { 
      passableMap: passableMap,
      cols: json.ground.cols, rows: json.ground.rows,
      size: TileSize
    } );
    this.nodeList = this.nodeMap.filter( e => e != null );

    document.body.appendChild( Pathfinding.getNodeMapSVG( this.nodeMap ) );

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

  getNodeAt( x, y ) {
    const col = Math.floor( x / TileSize );
    const row = Math.floor( y / TileSize );
    return this.nodeMap[ col + row * this.tileMap.cols ];
  }

  getRandomNode() {
    return this.nodeList[ Math.floor( Math.random() * this.nodeList.length ) ];
  }

  setGroundAt( x, y, tileInfoKey ) {
    const col = Math.floor( x / TileSize );
    const row = Math.floor( y / TileSize );

    this.tileMap.setTileInfoKeyAt( col, row, tileInfoKey );
  }
}