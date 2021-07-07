export class Images {
  static #images = new Map();

  static load(path) {
    if (!this.#images.has(path)) {
      const image = new Image();
      image.src = path;

      this.#images.set(path, image);
    }

    return this.#images.get(path);
  }
}