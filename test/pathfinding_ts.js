import * as NodeTest from '../build/test/pathfinding.js';

const testStr = 'All tests completed';
console.time( testStr );

for ( let i = 10; i < 20; i ++ ) {
  NodeTest.benchmarkPathfinding( i, i );
}

console.timeEnd( testStr );