export class EventBus {
  constructor(logger) {
    this.listeners = new Map();
    this.logger = logger;
  }

  subscribe(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(listener);
    this.logger.info(`Subscribed to event: ${event}`);
    return this;
  }

  async publish(event, data) {
    this.logger.info(`Publishing event: ${event}`, { event });
    const eventListeners = this.listeners.get(event) || [];

    const promises = eventListeners.map(async (listener) => {
      try {
        await listener(data);
      } catch (error) {
        this.logger.error(`Error in event listener for event: ${event}`, {
          error: error.message,
          stack: error.stack
        });
      }
    });

    await Promise.all(promises);
  }
}