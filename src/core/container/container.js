export class Container {
  #instances = new Map();

  #factories = new Map();

  registerInstance(token, instance) {
    if (this.#instances.has(token) || this.#factories.has(token)) {
      throw new Error(`Service already registered: ${token}`);
    }

    this.#instances.set(token, instance);

    return this;
  }

  registerFactory(token, factory) {
    if (this.#instances.has(token) || this.#factories.has(token)) {
      throw new Error(`Service already registered: ${token}`);
    }

    this.#factories.set(token, {
      factory,
      instance: null,
      initialized: false
    });

    return this;
  }

  resolve(token) {
    if (this.#instances.has(token)) {
      return this.#instances.get(token);
    }

    const entry = this.#factories.get(token);

    if (!entry) {
      throw new Error(`Service not found: ${token}`);
    }

    if (!entry.initialized) {
      entry.instance = entry.factory(this);
      entry.initialized = true;
    }

    return entry.instance;
  }

  has(token) {
    return this.#instances.has(token) || this.#factories.has(token);
  }
}