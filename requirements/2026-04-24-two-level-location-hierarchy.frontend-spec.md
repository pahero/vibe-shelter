# Frontend Specification: Location Management

## Overview
This spec defines the frontend implementation for managing locations (shelters, clinics, foster homes) in the Shelter application. The frontend provides a user interface for CRUD operations on locations and integration with backend location endpoints.

## Feature Scope
- Location list page with filtering by type and owner
- Create location form
- Edit location page
- Location detail view
- Location cards/components for reuse
- API integration with backend `/api/locations` endpoints

## UI Requirements

### Location List Page (`/locations`)
**Purpose:** Display all locations with filtering and management options

**Components:**
- Location filters:
  - Filter by type (SHELTER, CLINIC, FOSTER)
  - Filter by status (ACTIVE, INACTIVE, ARCHIVED)
  - Filter by owner (for foster locations)
  - Search by name
- Location cards displaying:
  - Location name
  - Location type (with visual indicator/badge)
  - Description
  - Owner name (if foster location)
  - Status
  - Action buttons: View, Edit, Archive/Restore
- "Create Location" button (CTA)
- Pagination controls (limit, offset)
- Empty state messaging when no locations exist

**Interactions:**
- Click location card → Navigate to location detail
- Click "Edit" button → Navigate to edit location form
- Click "Create Location" → Navigate to create location form
- Click "Archive" → Soft delete location (status → ARCHIVED)
- Filter/search → Update query params, refetch locations
- Pagination → Update skip/limit, refetch locations

**Loading/Error States:**
- Loading state while fetching locations
- Error message if fetch fails
- Show "No locations matching filters" if results empty

### Create/Edit Location Form
**Purpose:** Form for creating new locations or updating existing ones

**Fields:**
- Name (required, text input)
- Description (optional, textarea)
- Type (required, dropdown: SHELTER, CLINIC, FOSTER)
- Owner (optional, searchable user dropdown, only for FOSTER type)
- Status (optional on create, defaults to ACTIVE; on edit can change to INACTIVE)

**Interactions:**
- Type selection changes visibility:
  - FOSTER type: Show owner field
  - SHELTER/CLINIC type: Hide owner field
- Form validation on change and submit
- Validation rules:
  - Name: required, 1-255 chars
  - Description: optional, 0-1000 chars
  - Type: required, must be SHELTER|CLINIC|FOSTER
  - Owner: optional, but if provided must exist
- Submit button:
  - Create mode: "Create Location"
  - Edit mode: "Update Location"
- Cancel button → Navigate back to location list
- Success feedback → Toast notification + redirect to list
- Error feedback → Show inline error messages

**API Contracts:**
- Create: `POST /api/locations` with `CreateLocationDto`
- Update: `PATCH /api/locations/:id` with `UpdateLocationDto`

### Location Detail Page (`/locations/:id`)
**Purpose:** View location details and see related information

**Display:**
- Location name (large heading)
- Location type (with icon/styling)
- Description
- Owner (if applicable)
- Status
- Created/Updated timestamps
- Action buttons: Edit, Archive/Restore, Delete
- Link to cat list filtered by this location (future: when cats exist)

**Interactions:**
- Click "Edit" → Navigate to edit form
- Click "Archive" → Confirm dialog → Archive location
- Click "Restore" (if archived) → Confirm dialog → Restore location
- Click "Delete" → Confirm dialog → Delete location (hard delete if allowed)

**API Contract:**
- Get: `GET /api/locations/:id`

## State Management

**Global State (Context or Store):**
- Locations list: Array of location objects, filtered/paginated state
- Current location (detail view): Single location object, loading/error state
- Form state (create/edit): Form values, validation errors, submission state

**Local Component State:**
- Filter values
- Pagination offset/limit
- Form field values
- Loading/error states for individual operations

## API Integration

**Endpoints Used:**
- `GET /api/locations` - List locations with filters
  - Query params: `type`, `status`, `ownerId`, `skip`, `limit`
  - Response: `{ data: Location[], total: number, skip: number, limit: number }`
- `POST /api/locations` - Create location
  - Body: `CreateLocationDto`
  - Response: `201 Created` with location object
- `GET /api/locations/:id` - Get single location
  - Response: `200 OK` with location object
- `PATCH /api/locations/:id` - Update location
  - Body: `UpdateLocationDto`
  - Response: `200 OK` with updated location object
- `DELETE /api/locations/:id` - Archive/soft delete location
  - Response: `204 No Content`

**Error Handling:**
- 400: Validation error - display validation message
- 404: Location not found - redirect to list with error toast
- 409: Conflict (duplicate name) - display error message
- 5xx: Server error - display generic error message

## Navigation Integration

**Sidebar/Navigation:**
- Add "Locations" link to main navigation (if not already present)
- Link to `/locations` page
- Accessible from dashboard/main menu

## Responsive Design

- Mobile: Stack layout, full-width cards, touch-friendly buttons
- Tablet: 2-column layout, adjusted spacing
- Desktop: 3-column card grid for locations

## Accessibility

- Semantic HTML (main, section, article)
- ARIA labels for buttons and form fields
- Keyboard navigation support
- Color + icon/text for status/type indicators (not color-only)

## Testing

**Component Tests:**
- Location list renders with data
- Filters update API query params
- Pagination works correctly
- Create/edit form validation
- Form submission to backend
- Error states and messaging
- Loading states

**E2E Tests (via Integration Testing Specialist):**
- Full user flow: View locations → Create location → Edit location → Delete location
- Filter locations by type, status, owner
- Pagination and sorting
- Error scenarios: duplicate name, invalid data, network failure

## Dependencies

**Frontend Libraries:**
- `react` - Components
- `next` - Routing and SSR
- `axios` or `fetch` - API calls
- Tailwind CSS - Styling
- Form handling: React Hook Form or similar
- Dropdown/select: Headless UI or custom

**Backend Dependencies:**
- Backend API running on `http://localhost:3000`
- OpenAPI spec at `/api/openapi.json`

## Future Enhancements

- Location sorting (by name, type, created date)
- Bulk location actions
- Location map visualization
- Location capacity/occupancy tracking
- Advanced filters (location age, etc.)
- Link to cats assigned to each location (when cats entity exists)
