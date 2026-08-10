<!--
Sync Impact Report
Version change: template -> 1.0.0
Modified principles:
- Template principle 1 -> I. Complete Test Coverage
- Template principle 2 -> II. Test Isolation
- Template principle 3 -> III. Parallel-Safe Execution
- Template principle 4 -> IV. Behavior-Focused Tests
- Template principle 5 -> V. Continuous Verification
Added sections:
- Testing Standards
- Development Workflow
Removed sections:
- None
Follow-up TODOs:
- None
-->
# Vibe Shelter Constitution

## Core Principles

### I. Complete Test Coverage
All production code MUST be covered by automated tests before it is considered complete.
Every change MUST include tests that exercise the changed behavior, failure modes, and relevant
edge cases. Untested code is not releasable unless the exception is documented in the change,
approved during review, and tracked as follow-up work.

Rationale: Required test coverage keeps implementation decisions verifiable and prevents hidden
regressions from accumulating in application, API, and infrastructure behavior.

### II. Test Isolation
Tests MUST be isolated from one another. A test MUST NOT depend on execution order, shared mutable
state, data left by another test, wall-clock timing assumptions, or external services that are not
explicitly controlled by the test harness. Each test MUST create, own, and clean up its required
state.

Rationale: Isolated tests produce deterministic results and make failures actionable instead of
environment-dependent.

### III. Parallel-Safe Execution
Automated tests MUST be safe to run in parallel by default. Test suites MUST avoid global resources,
fixed ports, shared files, shared database records, and process-wide configuration mutations unless
they are uniquely namespaced or protected by an explicit test fixture. Any test that cannot run in
parallel MUST document the reason and be separated from the default parallel suite.

Rationale: Parallel execution keeps feedback fast and exposes unsafe coupling between tests early.

### IV. Behavior-Focused Tests
Tests MUST verify observable behavior and contracts rather than implementation details. Unit tests
MUST cover local logic, integration tests MUST cover boundaries between components or services,
and end-to-end tests MUST cover critical user workflows. Mocking MUST preserve the real contract of
the dependency being replaced.

Rationale: Behavior-focused tests remain useful during refactoring and protect the outcomes users
and dependent systems rely on.

### V. Continuous Verification
All test suites required for a change MUST pass before merge or release. CI and local verification
commands MUST run without hidden manual setup beyond documented prerequisites. Flaky tests MUST be
fixed or quarantined with an owner and expiry date before the suite is treated as healthy.

Rationale: A reliable verification gate ensures that tested behavior remains true after integration
with the rest of the project.

## Testing Standards

Specifications, plans, tasks, and reviews MUST identify the tests that prove each acceptance
criterion. New or changed behavior MUST include automated tests at the lowest effective level and
additional integration or end-to-end coverage when behavior crosses process, network, database, or
UI boundaries. Test data MUST be generated or namespaced per test run so repeated and concurrent
runs do not conflict.

## Development Workflow

Development work MUST start by identifying the expected behavior and the automated test evidence
required to prove it. Reviews MUST reject changes that lack required tests, introduce order
dependencies, or make the default test suite unsafe for parallel execution. Any approved testing
exception MUST include its scope, reason, owner, and removal condition.

## Governance

This constitution is the highest-priority governance document for project delivery practices.
Project templates, specifications, plans, tasks, and reviews MUST comply with these principles.
When other guidance conflicts with this constitution, this constitution takes precedence.

Amendments MUST be proposed as a documented change to this file, include a Sync Impact Report, and
explain the reason for the change. Versioning follows semantic versioning: MAJOR for incompatible
principle removals or redefinitions, MINOR for new or materially expanded governance guidance, and
PATCH for clarifications that do not change obligations. Compliance MUST be reviewed during spec
planning, task creation, code review, and release readiness checks.

**Version**: 1.0.0 | **Ratified**: 2026-08-10 | **Last Amended**: 2026-08-10
