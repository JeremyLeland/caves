const propInfos = await ( await fetch( './propInfos.json' ) ).json();

export function prepareCSS( { tileSize } ) {
  const styleSheet = document.styleSheets[ 0 ];

  for ( let propInfoKey in propInfos ) {
    const propInfo = propInfos[ propInfoKey ];
    styleSheet.insertRule( `.${ propInfoKey } { 
      background-image: url( ${ propInfo.src.path } );
      width: ${ propInfo.size.cols * tileSize }; 
      height: ${ propInfo.size.rows * tileSize };
      background-position: -${ propInfo.src.col * tileSize } -${ propInfo.src.row * tileSize };
    }` );
  }
}

export function fromJson( { json, tileSize } ) {
  const propInfo = propInfos[ json.propInfoKey ];

  const div = document.createElement( 'div' );
  div.setAttribute( 'class', `prop ${ json.propInfoKey }` );
  div.style.left = ( json.col - propInfo.offset.cols ) * tileSize;
  div.style.top = ( json.row - propInfo.offset.rows ) * tileSize;
  div.style.zIndex = ( json.row + 0.5 ) * tileSize;
  document.body.appendChild( div );

}