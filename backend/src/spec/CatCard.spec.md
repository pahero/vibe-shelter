# CatCard Backend Specification

**Feature:** Cat card data model and API support for displaying cats in location lists and search results.

**Context:** The MVP requires users to open a location page, view the cats assigned to that location, add a cat, and open an individual cat profile. `CatCard` is the compact backend representation used for those list/card views; it is not a separate persisted entity.

---

## 1. Database Schema Requirements

### Cat Entity

Add a `Cat` model that stores the canonical fields needed to render a card and link to the full profile.

```prisma
model Cat {
  id                 String      @id @default(cuid())
  name               String
  sex                CatSex     @default(UNKNOWN)
  color              String?
  estimatedBirthDate DateTime?
  intakeDate         DateTime?
  rescueSource       String?
  microchipNumber    String?     @unique
  passportNumber     String?     @unique
  sterilizationStatus SterilizationStatus @default(UNKNOWN)
  status             CatStatus   @default(ACTIVE)
  currentLocationId  String?
  currentLocation    Location?   @relation(fields: [currentLocationId], references: [id], onDelete: SetNull)
  primaryPhotoKey    String?
  createdAt          DateTime    @default(now())
  updatedAt          DateTime    @updatedAt

  @@index([currentLocationId])
  @@index([status])
  @@index([name])
  @@index([intakeDate])
}

enum CatSex {
  FEMALE
  MALE
  UNKNOWN
}

enum SterilizationStatus {
  STERILIZED
  NOT_STERILIZED
  UNKNOWN
}

enum CatStatus {
  ACTIVE
  ADOPTED
  DECEASED
  ARCHIVED
}
```

### Location Relation Update

Update the existing `Location` model with the reverse relation once `Cat` is introduced:

```prisma
model Location {
  // existing fields
  cats Cat[]
}
```

### Data Constraints

- `name` is required and must be non-empty after trimming.
- `sex` is required and must be stored as a non-null enum value; use `UNKNOWN` when sex is not known.
- `sterilizationStatus` is required and must be stored as a non-null enum value; use `UNKNOWN` when status is not known.
- `microchipNumber` and `passportNumber` are optional but unique when provided.
- `currentLocationId` is optional to allow intake drafts, but active cats shown on location pages should normally have a location.
- Deleting a location must not delete cats; location references are set to `null`.
- Use only `primaryPhotoKey` for now. It stores the S3 object key for the primary photo until a dedicated attachment/photo model exists.
- API responses must return `primaryPhotoUrl` as a presigned URL generated from `primaryPhotoKey`; when `primaryPhotoKey` is `null`, `primaryPhotoUrl` must be `null`.

---

## 2. CatCard API Contract

`CatCard` is the response shape returned by list endpoints.

```typescript
interface CatCard {
  id: string;
  name: string;
  sex: 'FEMALE' | 'MALE' | 'UNKNOWN';
  color: string | null;
  estimatedBirthDate: string | null;
  intakeDate: string | null;
  status: 'ACTIVE' | 'ADOPTED' | 'DECEASED' | 'ARCHIVED';
  sterilizationStatus: 'STERILIZED' | 'NOT_STERILIZED' | 'UNKNOWN';
  currentLocationId: string | null;
  currentLocationName: string | null;
  primaryPhotoUrl: string | null;
  microchipNumber: string | null;
  updatedAt: string;
}
```

Dates are returned as ISO-8601 strings. Nullable fields must be present with `null` rather than omitted. `primaryPhotoUrl` is response-only and must be a presigned URL, not the stored object key.

---

## 3. API Endpoints

### GET /api/cats

**List cats as CatCard records**

Query Parameters:
- `locationId`: optional; return cats whose `currentLocationId` matches the location.
- `status`: optional; one of `ACTIVE`, `ADOPTED`, `DECEASED`, `ARCHIVED`; default `ACTIVE`.
- `search`: optional; case-insensitive match against `name`, `microchipNumber`, or `passportNumber`.
- `skip`: pagination offset; default `0`.
- `limit`: page size; default `50`, maximum `100`.

Response (200):
```json
{
  "data": [
    {
      "id": "cat-001",
      "name": "Mila",
      "sex": "FEMALE",
      "color": "Calico",
      "estimatedBirthDate": null,
      "intakeDate": "2026-04-01T00:00:00.000Z",
      "status": "ACTIVE",
      "sterilizationStatus": "STERILIZED",
      "currentLocationId": "loc-001",
      "currentLocationName": "Foster Evgenia",
      "primaryPhotoUrl": "https://s3.example.test/shelter/cats/mila.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...",
      "microchipNumber": "900123456789012",
      "updatedAt": "2026-04-24T10:00:00.000Z"
    }
  ],
  "total": 1,
  "skip": 0,
  "limit": 50
}
```

Validation and Errors:
- 400 for invalid `status`, `skip`, or `limit`.
- 404 is not used for an empty result set; return an empty `data` array.

---

### GET /api/cats/:id/card

**Get a single cat as a CatCard**

Response (200): a single `CatCard` object.

Errors:
- 404 when the cat does not exist.

---

### POST /api/cats

**Create a cat with fields required for CatCard display**

Request:
```json
{
  "name": "Mila",
  "sex": "FEMALE",
  "color": "Calico",
  "intakeDate": "2026-04-01",
  "rescueSource": "Found near clinic",
  "microchipNumber": "900123456789012",
  "passportNumber": null,
  "sterilizationStatus": "STERILIZED",
  "currentLocationId": "loc-001"
}
```

Response (201): created `CatCard` object with `primaryPhotoUrl` set to `null`. Primary photo upload is handled by the separate primary-photo endpoint.

Validation and Errors:
- 400 when `name` is missing or empty.
- 400 when `sex` or `sterilizationStatus` is missing or null.
- 400 when enum values are invalid.
- 400 when date fields are not valid dates.
- 404 when `currentLocationId` does not reference an active location.
- 409 when `microchipNumber` or `passportNumber` already exists.

---

### PATCH /api/cats/:id

**Update fields used by CatCard**

Response (200): updated `CatCard` object.

Validation and Errors:
- Same validation as `POST /api/cats` for provided fields.
- 404 when the cat does not exist.
- Changing `currentLocationId` updates the cat's current placement; detailed movement history is handled by the future `LocationHistory` feature.

---

### PUT /api/cats/:id/primary-photo

**Upload or replace the primary photo used by CatCard**

Request: `multipart/form-data` with a single file field named `photo`.

Backend behavior:
- Stream the uploaded photo data to S3-compatible storage.
- Generate and store the resulting S3 object key in `Cat.primaryPhotoKey`.
- Return the updated `CatCard` with `primaryPhotoUrl` generated from the stored key.

Response (200): updated `CatCard` object.

Validation and Errors:
- 400 when no `photo` file is provided.
- 404 when the cat does not exist.
- 500 when S3 upload fails.

---

## 4. Service Layer Requirements

Create a `CatsService` responsible for:
- Creating and updating cats.
- Returning paginated `CatCard` projections.
- Validating enum values, required fields, uniqueness, and active location references.
- Mapping Prisma `Cat` records plus joined `Location.name` into the `CatCard` response shape.
- Generating presigned `primaryPhotoUrl` response values from stored `primaryPhotoKey` values.

The service must not depend on frontend card assumptions beyond the API contract above.

---

## 5. Acceptance Criteria

- A location page can request `GET /api/cats?locationId=<id>` and receive only active cats currently assigned to that location by default.
- Search can find cats by name, microchip number, or passport number without requiring an exact case-sensitive match.
- Cat card responses include all fields defined in the `CatCard` contract, with nullable fields explicitly set to `null`.
- Cat card responses return presigned `primaryPhotoUrl` values and never expose `primaryPhotoKey`.
- Creating a cat with a valid active location returns a card that includes `currentLocationName`.
- Duplicate microchip or passport numbers are rejected with a conflict response.
- Archived, adopted, and deceased cats are excluded from default location lists unless requested via `status`.

---

## 6. Testing Requirements

- Unit tests for `CatsService` creation, updates, filtering, search, pagination, uniqueness errors, and location validation.
- E2E tests for `GET /api/cats`, `GET /api/cats/:id/card`, `POST /api/cats`, and `PATCH /api/cats/:id` using PostgreSQL-backed test data.
- Database migration validation must verify indexes, unique constraints, nullable location behavior, and enum defaults.
