export function fromJson( { json, propInfos, tileSize } ) {
  const propInfo = propInfos[ json.propInfoKey ];

  const div = document.createElement( 'div' );
  div.setAttribute( 'class', `prop ${ json.propInfoKey }` );
  div.style.left = ( json.col - propInfo.offset.cols ) * tileSize;
  div.style.top = ( json.row - propInfo.offset.rows ) * tileSize;
  div.style.zIndex = ( json.row + 0.5 ) * tileSize;
  document.body.appendChild( div );

}