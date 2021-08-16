import * as NodeTest from '../build/test/pathfinding.js';

const testStr = 'All tests completed';
console.time( testStr );

for ( let i = 10; i <= 200; i += 10 ) {
  NodeTest.benchmarkPathfinding( i, i );
}

console.timeEnd( testStr );