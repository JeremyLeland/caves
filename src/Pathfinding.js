export class Node {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.linkedNodes = new Set();
  }

  // This string is used when object is the key for a map
  toString() {
    return `${this.x},${this.y}`;
  }

  estimateCost(other) {
    return Math.sqrt(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2));
  }

  static linkNodes(a, b) {
    if (a != null && b != null) {
      a.linkedNodes.add(b);
      b.linkedNodes.add(a);
    }
  }

  // See https://en.wikipedia.org/wiki/A*_search_algorithm#Pseudocode
  // A* finds a path from start to goal.
  // h is the heuristic function. h(n) estimates the cost to reach goal from node n.
  static A_Star(start, goal /*, h*/) {
    // The set of discovered nodes that may need to be (re-)expanded.
    // Initially, only the start node is known.
    // This is usually implemented as a min-heap or priority queue rather than a hash-set.
    const openSet = new Set([start]);

    // For node n, cameFrom[n] is the node immediately preceding it on the cheapest path from start
    // to n currently known.
    const cameFrom = [];

    // For node n, gScore[n] is the cost of the cheapest path from start to n currently known.
    //gScore := map with default value of Infinity
    const gScore = [];
    gScore[start] = 0;

    // For node n, fScore[n] := gScore[n] + h(n). fScore[n] represents our current best guess as to
    // how short a path from start to finish can be if it goes through n.
    //fScore := map with default value of Infinity
    const fScore = [];
    fScore[start] = start.estimateCost(goal);

    while (openSet.size > 0) {
      // This operation can occur in O(1) time if openSet is a min-heap or a priority queue
      //current := the node in openSet having the lowest fScore[] value
      let bestNode = null, bestScore = Infinity;
      openSet.forEach(node => {
        if (gScore[node] < bestScore) {
          bestNode = node;
          bestScore = gScore[node];
        }
      });

      const current = bestNode;

      if (current == goal) {
        return reconstruct_path(cameFrom, current);
      }

      openSet.delete(current);

      current.linkedNodes.forEach(neighbor => {
        // d(current,neighbor) is the weight of the edge from current to neighbor
        // tentative_gScore is the distance from start to the neighbor through current
        const tentative_gScore = gScore[current] + current.estimateCost(neighbor);
        if (tentative_gScore < (gScore[neighbor] ?? Infinity)) {
          // This path to neighbor is better than any previous one. Record it!
          cameFrom[neighbor] = current;
          gScore[neighbor] = tentative_gScore;
          fScore[neighbor] = gScore[neighbor] + neighbor.estimateCost(goal);
          openSet.add(neighbor);
        }
      }); 
    }

    // Open set is empty but goal was never reached
    return null;
  }
}

function reconstruct_path(cameFrom, current) {
  const total_path = [current];

  while (cameFrom[current] != undefined) {
    current = cameFrom[current];
    total_path.unshift(current);
  }

  return total_path;
}