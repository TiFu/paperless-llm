
## [0.1.0-alpha] - 2026-06-30
# Changelog

All notable changes to this project are documented here, grouped by release. Until the first tagged release, all changes are listed under **Unreleased**.

## [Unreleased]

### Added

- Initial implementation of Paperless-LLM: automated document metadata generation for Paperless-ngx using LLMs.
- Job queue system with multi-step processing, fallout handling, and execution/audit logging.
- Prompt management: full prompt rendering (all fields and available options) and an editable Prompts page in the frontend.
- Auto document queue that automatically processes new Paperless-ngx documents, using each user's own Paperless-ngx token instead of a single global token.
- Backend authentication with a corresponding frontend login flow.
- Description generation for tags, correspondents, and document types.
- OpenAPI specification, with a generated client/DTOs shared between server and frontend.
- Docker and Helm deployment support, with the server and worker deployable as separate processes/containers.
- Document pagination and document URLs included in job responses.

### Changed

- Migrated the frontend from hand-written API calls to the OpenAPI-generated client.
- Reworked the backend's web layer with proper request/response translation and OpenAPI integration.
- Split the worker and server into independent CLIs/processes/Helm deployments for independent scaling.
- Various performance optimizations across frontend and backend.
- Upgraded the Node.js version and related Dockerfiles.

### Fixed

- Frontend authentication issues.
- Sort order for jobs and steps in the backend.
- Step cancellation handling.
- A backend caching bug.
- Various frontend stability issues and bugs.

### Documentation

- Added installation (Docker/Helm), configuration, architecture, and development docs, plus the OpenAPI and TypeDoc-generated code references.
