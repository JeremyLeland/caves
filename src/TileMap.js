export class Tile {
  constructor(src) {
    this.images = 
    [
      [
        [
          [
            null,                    // NW: 0, NE: 0, SW: 0, SE: 0
            extractImage(src, 0, 2), // NW: 0, NE: 0, SW: 0, SE: 1
          ],
          [
            extractImage(src, 2, 2), // NW: 0, NE: 0, SW: 1, SE: 0
            extractImage(src, 1, 2), // NW: 0, NE: 0, SW: 1, SE: 1
          ],
        ],
        [
          [
            extractImage(src, 0, 4), // NW: 0, NE: 1, SW: 0, SE: 0
            extractImage(src, 0, 3), // NW: 0, NE: 1, SW: 0, SE: 1
          ],
          [
            extractImage(src, 0, 6), // NW: 0, NE: 1, SW: 1, SE: 0
            extractImage(src, 2, 1), // NW: 0, NE: 1, SW: 1, SE: 1
          ] 
        ],
      ],
      [
        [
          [
            extractImage(src, 2, 4), // NW: 1, NE: 0, SW: 0, SE: 0
            extractImage(src, 1, 6), // NW: 1, NE: 0, SW: 0, SE: 1
          ],
          [
            extractImage(src, 2, 3), // NW: 1, NE: 0, SW: 1, SE: 0
            extractImage(src, 1, 1), // NW: 1, NE: 0, SW: 1, SE: 1
          ]
        ],
        [
          [
            extractImage(src, 1, 4), // NW: 1, NE: 1, SW: 0, SE: 0
            extractImage(src, 2, 0), // NW: 1, NE: 1, SW: 0, SE: 1

          ],
          [
            extractImage(src, 1, 0), // NW: 1, NE: 1, SW: 1, SE: 0
            extractImage(src, 1, 3), // NW: 1, NE: 1, SW: 1, SE: 1
          ]
        ]
      ],
    ];
  }
}

function extractImage(src, col, row, width = 32, height = 32) {
  const image = document.createElement('canvas');
  image.width = width;
  image.height = height;
  const ctx = image.getContext('2d');

  ctx.drawImage(src, col * width, row * height, width, height, 0, 0, width, height);
  return image;
}