// export class PathfindingNode {
//   constructor( x, y ) {
//     this.x = x;
//     this.y = y;
//     this.linkedNodes = new Set();

//     this.svg = getNodeSVG( this );
//     this.linksSVG = document.createElementNS( SVG_URI, 'path' );
//   }

//   updateSVG() {
//     const dStr = 
//       [...this.linkedNodes].map( e => 
//         `M ${ this.x },${ this.y } L ${ e.x },${ e.y }`
//       ).join( ' ' );
//     this.linksSVG.setAttribute( 'd', dStr );
//   }


//   static linkNodes( a, b ) {
//     if ( a != null && b != null ) {
//       a.linkedNodes.add( b );
//       b.linkedNodes.add( a );
//       a.updateSVG();
//       b.updateSVG();
//     }
//   }
// }

function estimateCost( a, b ) {
  return Math.hypot( b.x - a.x, b.y - a.y );
}

// const SVG_URI = 'http://www.w3.org/2000/svg';
// export function getNodeMapSVG( nodes ) {
//   const svg = document.createElementNS( SVG_URI, 'svg' );
//   svg.setAttribute( 'class', 'pathfinding nodeMap' );

//   nodes.forEach( node => {
//     if ( node != null ) {
//       svg.appendChild( getNodeSVG( node ) );

//       node.linkedNodes.forEach( link => {
//         svg.appendChild( getLinkSVG( node, link ) );
//       });
//     }
//   });

//   return svg;
// }

// export function getPathSVG( path ) {
//   const svg = document.createElementNS( SVG_URI, 'svg' );
//   svg.setAttribute( 'class', 'pathfinding nodePath' );

//   const pathSVG = document.createElementNS( SVG_URI, 'path' );
//   pathSVG.setAttribute( 'd', getPathSVGDString( path ) );
//   svg.appendChild( pathSVG );

//   return svg;
// }


export function getPathSVGDString( path ) {
  return path?.length > 0 ? `M${path.map( e => ` ${e.x} ${e.y} ` ).join( 'L' )}` : '';
}

// function getNodeSVG( node ) {
//   const circle = document.createElementNS( SVG_URI, 'circle' );
//   circle.setAttribute( 'cx', node.x );
//   circle.setAttribute( 'cy', node.y );
//   circle.setAttribute( 'r', 8 );
//   return circle;
// }

// function getLinkSVG( a, b ) {
//   const line = document.createElementNS( SVG_URI, 'line' );
//   line.setAttribute( 'x1', a.x );
//   line.setAttribute( 'y1', a.y );
//   line.setAttribute( 'x2', b.x );
//   line.setAttribute( 'y2', b.y );
//   return line;
// }

// See https://en.wikipedia.org/wiki/A*_search_algorithm#Pseudocode
// A* finds a path from start to goal.
// h is the heuristic function. h(n) estimates the cost to reach goal from node n.
export function getPath( start, goal ) {
  if ( start == null || goal == null ) {
    return null;
  }

  // The set of discovered nodes that may need to be (re-)expanded.
  // Initially, only the start node is known.
  // This is usually implemented as a min-heap or priority queue rather than a hash-set.
  const openSet = new Heap();
  openSet.insert( start, 0 );

  // For node n, cameFrom[n] is the node immediately preceding it on the cheapest path from start
  // to n currently known.
  const cameFrom = new Map();

  // For node n, gScore[n] is the cost of the cheapest path from start to n currently known.
  //gScore := map with default value of Infinity
  const gScore = new Map();
  gScore.set( start, 0 );

  // For node n, fScore[n] := gScore[n] + h(n). fScore[n] represents our current best guess as to
  // how short a path from start to finish can be if it goes through n.
  //fScore := map with default value of Infinity
  const fScore = new Map();
  fScore.set( start, estimateCost( start, goal ) );

  while ( openSet.size() > 0 ) {
    // This operation can occur in O(1) time if openSet is a min-heap or a priority queue
    const current = openSet.pop();

    if ( current == goal ) {
      return reconstruct_path( cameFrom, current );
    }

    current.neighbors.forEach( neighbor => {
      if ( neighbor.passable ) {
        // d(current,neighbor) is the weight of the edge from current to neighbor
        // tentative_gScore is the distance from start to the neighbor through current
        const tentative_gScore = gScore.get( current ) + estimateCost( current, neighbor );
        if ( tentative_gScore < ( gScore.get( neighbor ) ?? Infinity ) ) {
          // This path to neighbor is better than any previous one. Record it!
          cameFrom.set( neighbor, current );
          gScore.set( neighbor, tentative_gScore );
          fScore.set( neighbor,  gScore.get( neighbor ) + estimateCost( neighbor, goal ) );
          openSet.insert( neighbor, tentative_gScore );
        }
      }
    } );
  }

  // Open set is empty but goal was never reached
  return null;
}

function reconstruct_path( cameFrom, current ) {
  const total_path = [ current ];

  while ( cameFrom.has( current ) ) {
    current = cameFrom.get( current );
    total_path.unshift( current );
  }

  // Leave off first node, since that's where Actor already is
  total_path.shift();

  return total_path;
}

// Based on https://eloquentjavascript.net/1st_edition/appendix2.html
class Heap {
  content = [];

  insert( item, score ) {
    // Add the new element to the end of the array.
    this.content.push( { item: item, score: score } );
    // Allow it to bubble up.
    this.bubbleUp( this.content.length - 1 );
  }

  pop() {
    // Store the first element so we can return it later.
    const result = this.content[ 0 ];
    // Get the element at the end of the array.
    const end = this.content.pop();
    // If there are any elements left, put the end element at the
    // start, and let it sink down.
    if ( this.content.length > 0 ) {
      this.content[ 0 ] = end;
      this.sinkDown( 0 );
    }
    return result.item;
  }

  size() {
    return this.content.length;
  }

  bubbleUp( index ) {
    // Fetch the element that has to be moved.
    var element = this.content[ index ];
    // When at 0, an element can not go up any further.
    while ( index > 0 ) {
      // Compute the parent element's index, and fetch it.
      const parentIndex = Math.floor( ( index + 1 ) / 2 ) - 1;
      const parent = this.content[ parentIndex ];
      // If the parent has a lesser score, things are in order and we
      // are done.
      if ( element.score >= parent.score )
        break;

      // Otherwise, swap the parent with the current element and
      // continue.
      this.content[ parentIndex ] = element;
      this.content[ index ] = parent;
      index = parentIndex;
    }
  }

  sinkDown( index ) {
    // Look up the target element and its score.
    const length = this.content.length;
    const element = this.content[ index ];

    while ( true ) {
      // Compute the indices of the child elements.
      const child2Index = ( index + 1 ) * 2, child1Index = child2Index - 1;
      // This is used to store the new position of the element,
      // if any.
      let swap = null;
      // If the first child exists (is inside the array)...
      const child1 = this.content[ child1Index ];
      if (child1Index < length) {
        // Look it up and compute its score.
        // If the score is less than our element's, we need to swap.
        if ( child1.score < element.score )
          swap = child1Index;
      }
      // Do the same checks for the other child.
      const child2 = this.content[ child2Index ];
      if ( child2Index < length ) {
        if ( child2.score < ( swap == null ? element.score : child1.score ) )
          swap = child2Index;
      }

      // No need to swap further, we are done.
      if ( swap == null ) break;

      // Otherwise, swap and continue.
      this.content[ index ] = this.content[ swap ];
      this.content[ swap ] = element;
      index = swap;
    }
  }
}
