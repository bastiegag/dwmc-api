# Observability

## Current Capabilities

The current backend provides:

- request/response logging through `src/shared/logger/request-logger.ts`
- a public liveness endpoint at `GET /health`
- a public database readiness endpoint at `GET /ready`
- centralized error handling through `src/shared/errors/error-handler.ts`
- startup environment validation with fail-fast behavior

The server also logs its local listening address on startup.

## Not Currently Configured

No source configuration was found for Sentry, hosted error reporting, distributed tracing, request IDs, metrics, or a deployment platform. Do not document those as available features.

If observability is expanded, update this document with the actual integration, secret handling, local behavior, and failure modes. Keep sensitive tokens and service-role credentials out of logs.
