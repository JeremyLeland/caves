export class ImageResource {
  constructor(src) {
    this.ready = new Promise((resolve, reject) => {
      this.image = new Image();
      this.image.onload = resolve;
      this.image.onerror = reject;
      this.image.src = src;
    });
  }

  getColorizedImage(color) {
    const canvas = document.createElement('canvas');
    canvas.width = this.image.width;
    canvas.height = this.image.height;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(this.image, 0, 0);
    
    // Apply color
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.image.width, this.image.height);

    // Restore transparency
    ctx.globalCompositeOperation = 'destination-atop';
    ctx.drawImage(this.image, 0, 0);

    return canvas;
  }
}