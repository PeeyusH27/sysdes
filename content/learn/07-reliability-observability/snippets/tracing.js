// @display-only: needs the OpenTelemetry packages and an OTLP collector
// OpenTelemetry auto-instrumentation (HTTP, Express, pg, ioredis…)
// Load before the app starts. ESM apps also need OTel's ESM loader hook (see the OTel Node docs).
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

new NodeSDK({
  serviceName: 'orders-api',
  traceExporter: new OTLPTraceExporter(),          // endpoint from OTEL_EXPORTER_OTLP_ENDPOINT
  instrumentations: [getNodeAutoInstrumentations()],
}).start();
// Outgoing HTTP calls now carry a `traceparent` header, so downstream spans join the same trace.
