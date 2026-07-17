export function createEnvironment(env = {}) {
  return Object.freeze({
    get(key) {
      return env[key];
    },

    has(key) {
      return Object.prototype.hasOwnProperty.call(env, key);
    },
  });
}
