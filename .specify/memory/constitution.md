# Astrozen Project Constitution

## Core Principles

### I. Library-First Architecture
All core business logic MUST be implemented as independent, self-contained service classes or modules ("libraries") that are decoupled from the transport layer (HTTP/API).
- **Rule**: Logic lives in `services/` or `core/`, not in `api/` endpoints.
- **Testability**: Services must be testable in isolation without a running server.

### II. Test-First Development (TDD)
We adhere to a strict Red-Green-Refactor cycle.
- **Rule**: You MUST create a failing test case that defines the expected behavior/contract BEFORE implementing the functionality.
- **Evidence**: PRs must show tests added/modified alongside code changes.

### III. Explicit Typing & Schemas
We prioritize type safety and explicit contracts.
- **Backend**: Use Pydantic models for all I/O. Type hints are mandatory (Python 3.11+).
- **Frontend**: Strict TypeScript interfaces for all components and API responses. No `any`.

### IV. Security by Design
Security is not an afterthought.
- **Rule**: All API endpoints defaults to `Authenticated` unless explicitly marked `Public`.
- **Data**: Validate all inputs at the schema level.

### V. Simplicity & YAGNI
Do not over-engineer.
- **Rule**: Implement only what is required by the current user story. Avoid speculative generality.

## Governance
- This constitution supersedes conflicting instructions in individual tasks.
- All code generation must verify compliance with these principles.

