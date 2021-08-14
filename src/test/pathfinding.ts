import { Node } from '../../build/Pathfinding.js';

export function generateTestNodes( cols: number, rows: number, size = 16, wallFrequency = cols - 3 ): Array< Node > {
  const nodesMap = [], nodesList = [];

  for ( let index = 0, row = 0; row < rows; row++ ) {
    for ( let col = 0; col < cols; col++, index++ ) {
      const node = index % wallFrequency == 0 ? null :
        new Node( col * size + size / 2, row * size + size / 2 );

      // null checking is handled by linkNodes()
      if ( col > 0 ) Node.linkNodes( node, nodesMap[ index - 1 ] );
      if ( row > 0 ) Node.linkNodes( node, nodesMap[ index - cols ] );

      if ( node != null ) {
        nodesMap[ index ] = node;
        nodesList.push( node );
      }
    }
  }

  return nodesList;
}

export function benchmarkPathfinding( cols: number, rows: number ) {
  const nodesList = generateTestNodes( cols, rows );

  console.log( `Finding paths in ${ cols }x${ rows } grid with ${ nodesList.length } nodes...` );
  const startTime = Date.now();

  let count = 0;
  for ( let start = 0; start < nodesList.length; start++ ) {
    for ( let end = start; end < nodesList.length; end++ ) {
      const path = Node.A_Star( nodesList[ start ], nodesList[ end ] );

      if ( !path ) {
        console.warn( `No path found from node ${ start } to node ${ end }` );
      }

      count++;
    }
  }

  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / count;

  console.log( `Took ${ totalTime }ms to find ${ count } paths in ${ cols }x${ rows } grid with ${ nodesList.length } nodes (~${ avgTime.toFixed( 3 ) }ms per path)` );
}