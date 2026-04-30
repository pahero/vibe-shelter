# Backend Specification: Flat Location Model with Type Support

**Feature:** Flat one-level location model for cat placement supporting multiple location types (shelter, clinic, foster)

**Date:** April 24, 2026

---

## 1. Database Schema Requirements

### Location Entity

```prisma
model Location {
  id          String    @id @default(cuid())
  name        String    @unique
  description String?
  type        String    // Enum: "shelter", "clinic", "foster"
  ownerId     String?   @db.Uuid // Optional reference to User
  owner       User?     @relation(fields: [ownerId], references: [id])
  status      String    @default("active") // "active", "archived", "inactive"
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  // cats        Cat[]     // Placeholder for future cat assignments
  // history     LocationHistory[] // Placeholder for future cat placement history

  @@index([type])
  @@index([ownerId])
  @@index([status])
}

### LocationHistory Entity (Future)

**Deferred until Cat entity is introduced**

When the Cat entity is created, LocationHistory will be added:

```prisma
model LocationHistory {
  id          String    @id @default(cuid())
  locationId  String
  location    Location  @relation(fields: [locationId], references: [id], onDelete: Cascade)
  catId       String
  action      String    // "assigned", "moved", "unassigned"
  timestamp   DateTime  @default(now())
  details     String?   // JSON: additional context

  @@index([locationId])
  @@index([catId])
  @@index([timestamp])
}
```
```

### User Entity (Existing - Verify for owner references)
- Ensure User entity has id field used in Location.ownerId
- Update User relations to include locations as owned

---

## 2. API Endpoints

### Location Management

#### POST /api/locations
**Create a new location**

Request:
```json
{
  "name": "Foster - Jane Smith",
  "description": "Foster home for long-term care",
  "type": "foster",
  "ownerId": "user-uuid-123" // Optional
}
```

Response (201):
```json
{
  "id": "loc-001",
  "name": "Foster - Jane Smith",
  "description": "Foster home for long-term care",
  "type": "foster",
  "ownerId": "user-uuid-123",
  "status": "active",
  "createdAt": "2026-04-24T10:00:00Z",
  "updatedAt": "2026-04-24T10:00:00Z"
}
```

Validation:
- `name` required, must be unique globally
- `type` required, must be one of: "shelter", "clinic", "foster"
- `ownerId` optional; if provided, must reference valid active user
- `description` optional

Errors:
- 400: Duplicate name
- 400: Invalid location type
- 400: Invalid or inactive owner user
- 409: Conflict if location already exists

---

#### GET /api/locations
**List all locations**

Query Parameters:
- `type`: Filter by location type (shelter, clinic, foster)
- `ownerId`: Filter by owner user ID
- `status`: Filter by status (active, archived, inactive)
- `skip`: Pagination offset (default 0)
- `limit`: Results per page (default 50)

Response (200):
```json
{
  "data": [
    {
      "id": "loc-001",
      "name": "Main Shelter",
      "description": "Primary shelter facility",
      "type": "shelter",
      "ownerId": null,
      "status": "active",
      "createdAt": "2026-04-24T10:00:00Z"
    },
    {
      "id": "loc-002",
      "name": "Main Clinic",
      "description": "Veterinary clinic",
      "type": "clinic",
      "ownerId": null,
      "status": "active",
      "createdAt": "2026-04-24T10:00:00Z"
    },
    {
      "id": "loc-003",
      "name": "Foster - Jane Smith",
      "type": "foster",
      "ownerId": "user-uuid-123",
      "status": "active",
      "createdAt": "2026-04-24T10:00:00Z"
    }
  ],
  "total": 3,
  "skip": 0,
  "limit": 50
}
```

---

#### GET /api/locations/:id
**Get single location details**

Response (200):
```json
{
  "id": "loc-001",
  "name": "Main Shelter",
  "description": "Primary shelter facility",
  "type": "shelter",
  "ownerId": null,
  "status": "active",
  "createdAt": "2026-04-24T10:00:00Z",
  "updatedAt": "2026-04-24T10:00:00Z"
}
```

Errors:
- 404: Location not found

---

#### PATCH /api/locations/:id
**Update location**

Request:
```json
{
  "name": "Foster - Jane & Bob Smith",
  "description": "Updated description",
  "status": "inactive"
}
```

Response (200): Updated location object

Validation:
- If updating `name`: must remain globally unique
- If updating `ownerId`: must reference valid user
- If updating `status` to "archived" or "inactive": check if cats are currently assigned
- Cannot delete location; use status change instead

Errors:
- 404: Location not found
- 400: Duplicate name
- 409: Cannot archive/inactivate location with active cat assignments

---

#### DELETE /api/locations/:id
**Delete location (soft delete via status)**

Response (204)

Implementation approach:
- Do NOT hard-delete; set status to "archived" instead
- Location archive operations are preserved at the Location level

---

### Cat Placement Endpoints (Future - Reserve Structure)

#### POST /api/cats/:catId/location
**Assign cat to location**

*Note: Cat entity does not exist yet. This endpoint structure is reserved for future implementation.*

Request:
```json
{
  "locationId": "loc-001"
}
```

Expected Response (200):
```json
{
  "catId": "cat-001",
  "locationId": "loc-001",
  "previousLocationId": null,
  "assignedAt": "2026-04-24T10:00:00Z"
}
```

Validation (to implement once cat entity exists):
- `locationId` must reference valid, active location
- Cat can only have one active location at a time
- Record change in LocationHistory

---

#### GET /api/cats?locationId=:id
**List cats by location**

*Note: Cat entity does not exist yet. This endpoint is reserved for future implementation.*

---

## 3. Service Layer

### LocationsService

```typescript
interface LocationsService {
  // Create
  createLocation(data: CreateLocationDto): Promise<Location>;
  
  // Read
  findAll(filters: LocationFilters): Promise<{ data: Location[], total: number }>;
  findById(id: string): Promise<Location>;
  findByOwnerId(ownerId: string): Promise<Location[]>;
  
  // Update
  updateLocation(id: string, data: UpdateLocationDto): Promise<Location>;
  
  // Status management
  archiveLocation(id: string): Promise<Location>;
  reactivateLocation(id: string): Promise<Location>;
  
  // Validation
  validateLocationExists(id: string): Promise<boolean>;
  validateLocationActive(id: string): Promise<boolean>;
  validateLocationTypeValid(type: string): Promise<boolean>;
}
```

### LocationHistoryService (Future)

Reserved for future implementation when Cat entity is introduced:

```typescript
interface LocationHistoryService {
  recordLocationChange(data: LocationChangeEvent): Promise<void>;
  getLocationHistoryForCat(catId: string): Promise<LocationHistory[]>;
  getLocationChangesSince(locationId: string, since: Date): Promise<LocationHistory[]>;
}
```

---

## 4. Data Validation & Business Rules

### Location Type Constraints
- **shelter**: Common location for multiple cats; ownerId should be null
- **clinic**: Veterinary facility; ownerId should be null
- **foster**: Individual caregiver location; ownerId **should** reference a User

### Status Lifecycle
- **active**: Location is available for new cat assignments
- **inactive**: Location temporarily unavailable; no new assignments
- **archived**: Location is historical; no new assignments, but visible in history

### Uniqueness Rules
- Location `name` must be globally unique
- Cannot have two locations with same name, even if types differ

### Owner/User Validation
- If `ownerId` is provided, referenced user must exist and be active
- If user is deactivated, location should not be automatically deactivated but should be reviewed

### Cat Assignment Constraints (Future)
- When cat entity is introduced:
  - Location must be active to accept new assignments
  - Cannot delete location with active cat assignments
  - Moving cat between locations must preserve timeline correctness

---

## 5. Migration Strategy

### Initial Migration (20260424_add_locations)

```sql
CREATE TABLE "Location" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "name"        TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "type"        TEXT NOT NULL,
  "ownerId"     UUID,
  "status"      TEXT NOT NULL DEFAULT 'active',
  "createdAt"   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP NOT NULL,
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE INDEX "Location_type_idx" ON "Location"("type");
CREATE INDEX "Location_ownerId_idx" ON "Location"("ownerId");
CREATE INDEX "Location_status_idx" ON "Location"("status");
```

### LocationHistory Migration (Future)

**Deferred until Cat entity is introduced**

When cats are added to the system:

```sql
```

### Backward Compatibility
- No existing location data exists (system is new)
- No data migrations needed
- No deprecated endpoint handling required

---

## 6. Acceptance Criteria

### Backend Implementation
- ✅ Location entity created in Prisma with all required fields
- ✅ Location type validation enforced (shelter, clinic, foster)
- ✅ All CRUD endpoints implemented and tested
- ✅ Location filtering by type, owner, and status working
- ✅ Uniqueness constraint on location name enforced at DB and API level
- ✅ Owner/user validation functional
- ✅ 404 errors for missing locations
- ✅ 400 errors for validation failures
- ✅ 409 errors for constraint violations
- ✅ LocationHistory table reserved for future implementation when Cat entity is added
- ✅ All endpoints return correct status codes and response shapes

### Unit Tests
- ✅ LocationsService: Create, read, update, archive operations
- ✅ LocationsService: Validation for type, name uniqueness, owner references
- ✅ LocationsService: Filter and pagination logic
- ✅ DTOs: Validate input/output contracts
- ✅ Error handling: Test 400, 404, 409 scenarios
- ✅ Database constraints: Test unique name enforcement

### E2E Tests
- ✅ POST /api/locations: Create shelter, clinic, foster locations
- ✅ POST /api/locations: Reject invalid type, duplicate name, invalid owner
- ✅ GET /api/locations: List all, filter by type, filter by owner, filter by status
- ✅ GET /api/locations/:id: Retrieve single location
- ✅ PATCH /api/locations/:id: Update name, description, status
- ✅ DELETE /api/locations/:id: Soft-delete via archive
- ✅ Verify location appears/disappears in lists based on status

---

## 7. Implementation Notes

### Architecture Decisions
1. **Soft deletes only**: Locations are archived, not hard-deleted, for history integrity
2. **No hierarchy**: Location table is flat; no parent references
3. **Optional owner**: Owner field enables foster labeling without forcing it on shelter/clinic
4. **LocationHistory table**: Prepared for cat assignment tracking when cat entity is introduced

### Dependencies
- Prisma ORM (existing)
- NestJS framework (existing)
- User entity (must exist and be accessible)

### Testing Strategy
- Use Testcontainers for all DB tests (no mocking of Prisma)
- Test happy path and all validation failure modes
- Test pagination and filtering combinations
- E2E tests cover complete request/response cycle

### Future Considerations
- When cats entity is introduced, LocationHistory will track assignments
- Consider adding location-based permissions/access control
- May need archive/restore/bulk operations in future

---

## 8. Success Criteria Summary

**This implementation is complete when:**
1. All location CRUD endpoints work correctly with proper validation
2. All unit tests pass (100% coverage of LocationsService)
3. All E2E tests pass (every endpoint tested with valid/invalid inputs)
4. Location type validation enforces shelter/clinic/foster
5. Location name uniqueness is enforced
6. Owner/user references work correctly
7. Status transitions (active → archived → active) work as expected
8. Backend is ready for integration with cat placement features (future)
