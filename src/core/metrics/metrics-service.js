export class MetricsService {
  constructor(logger) {
    this.logger = logger;
  }

  increment(metricName, value = 1, tags = {}) {
    this.logger.info(`[METRIC_COUNTER] ${metricName}`, {
      metric_type: 'counter',
      metric_name: metricName,
      metric_value: value,
      ...tags,
    });
  }

  timing(metricName, durationMs, tags = {}) {
    this.logger.info(`[METRIC_TIMING] ${metricName}`, {
      metric_type: 'timing',
      metric_name: metricName,
      metric_value: durationMs,
      ...tags,
    });
  }
}
