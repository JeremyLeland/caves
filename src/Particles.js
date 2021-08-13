export class TextParticle {
  constructor({ x, y, text, color }) {
    this.x = x;
    this.y = y;
    this.dx = 0;
    this.dy = -0.05;
    this.text = text;
    this.color = color;
    this.life = this.maxLife = 1000;
  }

  update( dt ) {
    this.x += this.dx * dt;
    this.y += this.dy * dt;
    this.life -= dt;
  }

  draw( ctx ) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = this.color;
    ctx.globalAlpha = Math.sin( this.life / this.maxLife );
    ctx.fillText( this.text, this.x, this.y );
    ctx.restore();
  }
}