import { PathfindingNode } from '../Pathfinding.js';

const size = 32;
const rows = 10, cols = 10;
const isPassableMap = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 
  1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 
  1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 
  1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 
  1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 
  1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 
  1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 
  1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 
  1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 
].map( e => e == 1 );

const nodesMap = PathfindingNode.generateNodes( cols, rows, isPassableMap, size );

const canvas = document.createElement( 'canvas' );
canvas.width = cols * size;
canvas.height = rows * size;
const ctx = canvas.getContext( '2d' );

PathfindingNode.drawNodes( ctx, nodesMap, size / 3 );

document.body.appendChild( canvas );

export function benchmarkPathfinding( cols: number, rows: number ) {
  const wallFrequency = cols - 3;
  const isPassableMap = Array.from( Array( cols * rows ), 
    ( _, index ) => ( index % wallFrequency ) != 0 );

  const testNodes = PathfindingNode.generateNodes( cols, rows, isPassableMap );
  const testNodesList = testNodes.filter( e => e != null );

  //console.log( `Finding paths in ${ cols }x${ rows } grid with ${ nodesList.length } nodes...` );
  const startTime = Date.now();

  const start = testNodesList[ 0 ];
  const end = testNodesList[ testNodesList.length - 1 ];

  const iterations = 100;

  for ( let i = 0; i < iterations; i ++ ) {
    const path = PathfindingNode.A_Star( start, end );

    if ( !path ) {
      console.warn( `No path found from node ${ start } to node ${ end }` );
    }
  }

  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;

  console.log( `${cols}x${rows}, ${ avgTime }ms`);
  //console.log( `Took ${ totalTime }ms to find ${ count } paths in ${ cols }x${ rows } grid with ${ nodesList.length } nodes (~${ avgTime.toFixed( 3 ) }ms per path)` );
}