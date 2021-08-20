export class PathfindingNode {
  x: number;
  y: number;
  linkedNodes = new Set< PathfindingNode >();

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  // This string is used when object is the key for a map
  // TODO: Try to avoid this! Spending a lot of time building these
  toString() {
    return `${this.x},${this.y}`;
  }

  estimateCost( other: PathfindingNode ) {
    // TODO: Faster without the hypot? Not sure it matters much
    return Math.hypot( this.x - other.x, this.y - other.y );
  }

  static linkNodes( a: PathfindingNode, b: PathfindingNode ) {
    if ( a != null && b != null ) {
      a.linkedNodes.add( b );
      b.linkedNodes.add( a );
    }
  }

  static drawNodes( ctx:CanvasRenderingContext2D, nodes: Array< PathfindingNode >, size = 8 ) {
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'white';

    nodes.forEach( node => {
      if (node != null) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
        ctx.fill();

        node.linkedNodes.forEach(link => {
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(link.x, link.y);
          ctx.stroke();
        });
      }
    });
  }

  static drawPath( ctx:CanvasRenderingContext2D, path: Array< PathfindingNode >, size = 8 ) {
    for (let i = 0; i < path.length; i ++) {
      // go from yellow to green
      const percent = i / path.length;
      ctx.fillStyle = `rgba(${255 - percent * 255}, 255, 0, 0.3)`;
      ctx.strokeStyle = `rgba(${255 - percent * 255}, 255, 0, 0.3)`;

      const node = path[i];

      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
      ctx.fill();

      if (i > 0) {
        const lastNode = path[i-1];
        ctx.beginPath();
        ctx.moveTo(lastNode.x, lastNode.y);
        ctx.lineTo(node.x, node.y);
        ctx.stroke();
      }
    }
  }

  static generateNodes( cols: number, rows: number, isPassable: Array< boolean >, size = 16 ) {
    const nodesMap = [];

    for ( let index = 0, row = 0; row < rows; row++ ) {
      for ( let col = 0; col < cols; col++, index++ ) {
        if ( isPassable[ index ] ) {
          const node = new PathfindingNode( col * size + size / 2, row * size + size / 2 );

          // null checking is handled by linkNodes()
          if ( col > 0 ) PathfindingNode.linkNodes( node, nodesMap[ index - 1 ] );
          if ( row > 0 ) PathfindingNode.linkNodes( node, nodesMap[ index - cols ] );

          nodesMap[ index ] = node;
        }
        else {
          nodesMap[ index ] = null;
        }
      }
    }

    return nodesMap;
  }

  // See https://en.wikipedia.org/wiki/A*_search_algorithm#Pseudocode
  // A* finds a path from start to goal.
  // h is the heuristic function. h(n) estimates the cost to reach goal from node n.
  static A_Star( start: PathfindingNode, goal: PathfindingNode /*, h*/ ) {
    if ( start == null || goal == null ) {
      //console.warn("A_Star called with null arguments!");
      return null;
    }

    // The set of discovered nodes that may need to be (re-)expanded.
    // Initially, only the start node is known.
    // This is usually implemented as a min-heap or priority queue rather than a hash-set.
    //const openSet = new Set( [ start ] );
    const openSet = new NodeScoreHeap();
    openSet.insert( start, 0 );

    // For node n, cameFrom[n] is the node immediately preceding it on the cheapest path from start
    // to n currently known.
    const cameFrom = new Map< PathfindingNode, PathfindingNode >();

    // For node n, gScore[n] is the cost of the cheapest path from start to n currently known.
    //gScore := map with default value of Infinity
    const gScore = new Map< PathfindingNode, number >();
    gScore.set( start, 0 );

    // For node n, fScore[n] := gScore[n] + h(n). fScore[n] represents our current best guess as to
    // how short a path from start to finish can be if it goes through n.
    //fScore := map with default value of Infinity
    const fScore = new Map< PathfindingNode, number >();
    fScore.set( start, start.estimateCost( goal ) );

    //while ( openSet.size > 0 ) {
    while ( openSet.size() > 0 ) {
      // This operation can occur in O(1) time if openSet is a min-heap or a priority queue
      //current := the node in openSet having the lowest fScore[] value
      // let bestNode : Node = null, bestScore = Infinity;
      // openSet.forEach( node => {
      //   const score = gScore.get( node );
      //   if ( score < bestScore ) {
      //     bestNode = node;
      //     bestScore = score;
      //   }
      // } );

      const current = openSet.pop();

      if ( current == goal ) {
        return reconstruct_path( cameFrom, current );
      }

      //openSet.delete( current );
      // handled by remove above

      current.linkedNodes.forEach( neighbor => {
        // d(current,neighbor) is the weight of the edge from current to neighbor
        // tentative_gScore is the distance from start to the neighbor through current
        const tentative_gScore = gScore.get( current ) + current.estimateCost( neighbor );
        if ( tentative_gScore < ( gScore.get( neighbor ) ?? Infinity ) ) {
          // This path to neighbor is better than any previous one. Record it!
          cameFrom.set( neighbor, current );
          gScore.set( neighbor, tentative_gScore );
          fScore.set( neighbor,  gScore.get( neighbor ) + neighbor.estimateCost( goal ) );
          //openSet.add( neighbor );
          openSet.insert( neighbor, tentative_gScore );
        }
      } );
    }

    // Open set is empty but goal was never reached
    return null;
  }
}

function reconstruct_path( cameFrom: Map< PathfindingNode, PathfindingNode >, current: PathfindingNode ) {
  const total_path = [ current ];

  while ( cameFrom.has( current ) ) {
    current = cameFrom.get( current );
    total_path.unshift( current );
  }

  return total_path;
}

interface NodeScore {
  node: PathfindingNode;
  score: number;
}

// Based on https://eloquentjavascript.net/1st_edition/appendix2.html
class NodeScoreHeap {
  content = Array< NodeScore >();

  insert(node: PathfindingNode, score: number) {
    // Add the new element to the end of the array.
    this.content.push( { node: node, score: score } );
    // Allow it to bubble up.
    this.bubbleUp(this.content.length - 1);
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
    return result.node;
  }

  size() {
    return this.content.length;
  }

  bubbleUp( index: number ) {
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

  sinkDown( index: number ) {
    // Look up the target element and its score.
    const length = this.content.length;
    const element = this.content[ index ];

    while ( true ) {
      // Compute the indices of the child elements.
      const child2Index = (index + 1) * 2, child1Index = child2Index - 1;
      // This is used to store the new position of the element,
      // if any.
      let swap = null;
      // If the first child exists (is inside the array)...
      const child1 = this.content[ child1Index ];
      if (child1Index < length) {
        // Look it up and compute its score.
        // If the score is less than our element's, we need to swap.
        if (child1.score < element.score)
          swap = child1Index;
      }
      // Do the same checks for the other child.
      const child2 = this.content[ child2Index ];
      if (child2Index < length) {
        if (child2.score < (swap == null ? element.score : child1.score))
          swap = child2Index;
      }

      // No need to swap further, we are done.
      if (swap == null) break;

      // Otherwise, swap and continue.
      this.content[index] = this.content[swap];
      this.content[swap] = element;
      index = swap;
    }
  }
}