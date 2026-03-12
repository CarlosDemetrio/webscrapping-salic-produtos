import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

export function initTracing() {
  const prometheusExporter = new PrometheusExporter({
    port: 9464,
  });

  const meterProvider = new MeterProvider({
    readers: [prometheusExporter],
  });

  const sdk = new NodeSDK({
    serviceName: 'salic-scraper',
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => meterProvider.shutdown())
      .then(() => process.exit(0))
      .catch(() => {
        process.exit(1);
      });
  });

  return { sdk, meterProvider };
}
