function createNode( x, y ) {
  return {
    x: x,
    y: y,
    linkedNodes: new Set()
  };
}

function estimateCost( a, b ) {
  return Math.hypot( b.x - a.x, b.y - a.y );
}

function linkNodes( a, b ) {
  if ( a != null && b != null ) {
    a.linkedNodes.add( b );
    b.linkedNodes.add( a );
  }
}

export function getNodeMap( { passableMap, cols, rows, size } ) {
  const nodesMap = [];

  for ( let index = 0, row = 0; row < rows; row++ ) {
    for ( let col = 0; col < cols; col++, index++ ) {
      if ( passableMap[ index ] ) {
        const node = createNode( ( col + 0.5 ) * size, ( row + 0.5 ) * size );

        // null checking is handled by linkNodes()
        if ( col > 0 ) linkNodes( node, nodesMap[ index - 1 ] );
        if ( row > 0 ) linkNodes( node, nodesMap[ index - cols ] );

        // Diagonals 
        if ( row > 0 /*&& passableMap[ index - cols ]*/ ) {
          if ( col > 0 /*&& passableMap[ index - 1 ]*/ ) {
            linkNodes( node, nodesMap[ index - 1 - cols ] );
          }
          if ( col < cols - 1 /*&& passableMap[ index + 1 ]*/ ) {
            linkNodes( node, nodesMap[ index + 1 - cols ] );
          }
        }

        nodesMap[ index ] = node;
      }
      else {
        nodesMap[ index ] = null;
      }
    }
  }

  return nodesMap;
}

const SVG_URI = 'http://www.w3.org/2000/svg';
export function getSVG( nodes, radius ) {
  const fragment = new DocumentFragment();

  nodes.forEach( node => {
    if ( node != null ) {
      const circle = document.createElementNS( SVG_URI, 'circle' );
      circle.setAttribute( 'cx', node.x );
      circle.setAttribute( 'cy', node.y );
      circle.setAttribute( 'r', 8 );    // TODO: can this come from CSS?
      fragment.appendChild( circle );

      node.linkedNodes.forEach( link => {
        const line = document.createElementNS( SVG_URI, 'line' );
        line.setAttribute( 'x1', node.x );
        line.setAttribute( 'y1', node.y );
        line.setAttribute( 'x2', link.x );
        line.setAttribute( 'y2', link.y );
        fragment.appendChild( line );
      });
    }
  });

  return fragment;
}