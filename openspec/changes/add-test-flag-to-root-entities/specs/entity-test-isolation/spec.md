## Purpose

Provides test-status isolation for root domain entities so test users and regular users operate on separate cats, locations, and other top-level records without cross-contaminating workflows.

## ADDED Requirements

### Requirement: Root entities carry test status
The system SHALL store a required test-status marker on every root entity that represents independently created shelter data, including cats and locations.

#### Scenario: Root entity has test marker
- **WHEN** a root entity is created successfully
- **THEN** the stored entity records whether it is a test entity or a regular entity

#### Scenario: Existing root entity default
- **WHEN** an existing root entity has no prior test-status marker during rollout
- **THEN** the system treats it as a regular entity unless an existing trusted signal identifies it as test data

### Requirement: Creation derives test status from current user
The system SHALL assign a root entity's test-status marker from the authenticated current user's test-user marker and SHALL NOT allow clients to choose a different root entity test status during creation.

#### Scenario: Test user creates root entity
- **WHEN** an authenticated test user creates a cat, location, or other root entity
- **THEN** the created entity is stored as a test entity

#### Scenario: Regular user creates root entity
- **WHEN** an authenticated regular user creates a cat, location, or other root entity
- **THEN** the created entity is stored as a regular entity

#### Scenario: Client submits conflicting marker
- **WHEN** a create request includes a test-status value that conflicts with the current user's test-user marker
- **THEN** the system ignores or rejects the client-provided value and does not create an entity with the conflicting status

### Requirement: Reads are filtered by current user test status
The system SHALL filter root entity read operations by the authenticated current user's test-user marker so users only receive entities with the matching test status.

#### Scenario: Test user lists root entities
- **WHEN** an authenticated test user lists cats, locations, or other root entities
- **THEN** the response includes test entities and excludes regular entities

#### Scenario: Regular user lists root entities
- **WHEN** an authenticated regular user lists cats, locations, or other root entities
- **THEN** the response includes regular entities and excludes test entities

#### Scenario: User requests opposite-status entity by identifier
- **WHEN** an authenticated user requests a root entity whose test-status marker does not match the current user's test-user marker
- **THEN** the system does not disclose that entity through the current user's root entity read workflow

### Requirement: Root entity relationships respect test isolation
The system SHALL prevent root entity operations from creating or exposing relationships across different test-status partitions.

#### Scenario: Test cat uses location
- **WHEN** an authenticated test user creates or updates a cat with a location
- **THEN** the selectable and accepted locations are limited to test locations

#### Scenario: Regular cat uses location
- **WHEN** an authenticated regular user creates or updates a cat with a location
- **THEN** the selectable and accepted locations are limited to regular locations

#### Scenario: Cross-status relationship attempted
- **WHEN** a root entity operation references a related root entity with a different test-status marker
- **THEN** the operation fails or behaves as if the related entity is unavailable
