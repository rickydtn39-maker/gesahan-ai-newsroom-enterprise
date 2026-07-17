export class Container {
  #services = new Map();

  register(token, instance) {
    if (this.#services.has(token)) {
      throw new Error(`Service already registered: ${token}`);
    }

    this.#services.set(token, instance);

    return this;
  }

  resolve(token) {
    if (!this.#services.has(token)) {
      throw new Error(`Service not found: ${token}`);
    }

    return this.#services.get(token);
  }

  has(token) {
    return this.#services.has(token);
  }
}