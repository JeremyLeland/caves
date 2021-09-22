import { TileSize } from './tilemap.js';

const propInfos = await ( await fetch( './propInfos.json' ) ).json();

export function prepareCSS() {
  const styleSheet = document.styleSheets[ 0 ];

  for ( let propInfoKey in propInfos ) {
    const propInfo = propInfos[ propInfoKey ];
    styleSheet.insertRule( `.${ propInfoKey } { 
      background-image: url( ${ propInfo.src.path } );
      width: ${ propInfo.size.cols * TileSize }; 
      height: ${ propInfo.size.rows * TileSize };
      background-position: -${ propInfo.src.col * TileSize } -${ propInfo.src.row * TileSize };
    }` );
  }
}

export function fromJson( json ) {
  const propInfo = propInfos[ json.propInfoKey ];

  const div = document.createElement( 'div' );
  div.setAttribute( 'class', `prop ${ json.propInfoKey }` );
  div.style.left = ( json.col - propInfo.offset.cols ) * TileSize;
  div.style.top = ( json.row - propInfo.offset.rows ) * TileSize;
  div.style.zIndex = ( json.row + 0.5 ) * TileSize;
  document.body.appendChild( div );

}