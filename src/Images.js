export class Images {

  static load(path) {
    const image = new Image();
    image.src = path;
    return image;
  }

  static async loadImages(paths) {
    const images = Array.from(paths, path => this.load(path));
    await Promise.all(images.map(image => image.decode()));
    return images;
  }

  static getColorized(image, red, green, blue) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const LUM_RED =   0.22248840;
    const LUM_GREEN = 0.71690369;
    const LUM_BLUE =  0.06060791;

    let [h, s, l] = rgb2hsl(red / 255, green / 255, blue / 255);

    let index = 0;
    for (let row = 0; row < canvas.height; row ++) {
      for (let col = 0; col < canvas.width; col ++) {
        let r = data[index] / 255;
        let g = data[index + 1] / 255;
        let b = data[index + 2] / 255;
        let a = data[index + 3];

        let lum = r * LUM_RED + g * LUM_GREEN + b * LUM_BLUE;
        let lightness = l * 2 - 1;

        if (lightness > 0) {
          lum = lum * (1.0 - lightness);
          lum += 1.0 - (1.0 - lightness);
        }
        else if (lightness < 0) {
          lum = lum * (lightness + 1.0);
        }

        [r, g, b] = hsl2rgb(h, s, lum);

        data[index]   = r * 255;
        data[index+1] = g * 255;
        data[index+2] = b * 255;
        data[index+3] = a;

        index += 4;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    return canvas;
  }

  
}

function intToRgb(i) { return [i, i >> 8, i >> 16].map(e => (e & 0xFF)); }

// See: https://stackoverflow.com/questions/36721830/convert-hsl-to-rgb-and-hex/54014428#54014428
function hsl2rgb(h,s,l) 
{
  // input: h in [0,360] and s,v in [0,1] - output: r,g,b in [0,1]
  let a= s*Math.min(l,1-l);
  let f= (n,k=(n+h/30)%12) => l - a*Math.max(Math.min(k-3,9-k,1),-1);
  return [f(0), f(8), f(4)];
}

function rgb2hsl(r,g,b) {
  // in: r,g,b in [0,1], out: h in [0,360) and s,l in [0,1]
  let v=Math.max(r,g,b), c=v-Math.min(r,g,b), f=(1-Math.abs(v+v-c-1)); 
  let h= c && ((v==r) ? (g-b)/c : ((v==g) ? 2+(b-r)/c : 4+(r-g)/c)); 
  return [60*(h<0?h+6:h), f ? c/f : 0, (v+v-c)/2];
}