export class LevelGen {
  // See https://gamedevelopment.tutsplus.com/tutorials/generate-random-cave-levels-using-cellular-automata--gamedev-9664
  static generateCave(cols, rows, {lifeChance = 0.4, birthLimit = 4, deathLimit = 2, steps = 6} = {}) {
    let cells = Array.from(
      Array(cols), () => Array.from(
        Array(rows), () => Math.random() < lifeChance));

    for (let i = 0; i < steps; i ++) {
      const newCells = Array.from(Array(cols), () => new Array(rows));
      
      for (let row = 0; row < rows; row ++) {
        for (let col = 0; col < cols; col ++) {
          // Count nearby walls (out of bounds is also walls)
          let nearby = 8;
          for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r ++) {
            for (let c = Math.max(0, col - 1); c <= Math.min(cols - 1, col + 1); c ++) {
              if ((r != row || c != col) && !cells[c][r]) {
                nearby --;
              }
            }
          }
  
          // Apply rules for birthing and dying
          newCells[col][row] = nearby > (cells[col][row] ? deathLimit : birthLimit);
        }
      }
  
      cells = newCells;
    }

    return cells;
  }
}

  