# Events Office CRUD Implementation

## Overview

This document describes the complete implementation of CRUD operations for Events Office accounts in the Zapvent admin system.

## Backend Implementation

### 1. Database Schema

Events Office accounts use the existing `Admin` model with `adminType: "EventOffice"`:

```typescript
// server/models/Admin.ts
export interface IAdmin extends IBaseModel {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  status: "Active" | "Blocked";
  adminType: "EventOffice" | "Admin"; // Distinguishes Events Office from regular admins
}
```

### 2. Service Layer (server/services/adminService.ts)

**New Functions:**

- `findAllEventsOffice()` - Fetches all accounts where `adminType === "EventOffice"`
- `updateAdmin(id, data)` - Updates admin/events office account fields (firstName, lastName, email)

**Updated:**

- `AdminResponse` interface now includes `adminType` field
- All existing admin functions updated to include `adminType` in responses

### 3. Controller Layer (server/controllers/adminController.ts)

**New Methods:**

- `getAllEventsOffice()` - GET endpoint for fetching events office accounts
- `createEventsOffice()` - POST endpoint with automatic `adminType: "EventOffice"`
- `updateEventsOffice()` - PATCH endpoint for updating account details
- `deleteEventsOffice()` - DELETE endpoint with self-deletion protection

### 4. Routes (server/routes/adminRoutes.ts)

```typescript
// New routes added:
GET    /admin/events-office         - List all Events Office accounts
POST   /admin/events-office         - Create new Events Office account
PATCH  /admin/events-office/:id     - Update Events Office account
DELETE /admin/events-office/:id     - Delete Events Office account
```

## Frontend Implementation

### 1. API Service Layer (lib/services/admin.ts)

**Interface:**

```typescript
export interface EventsOfficeAccount {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: "Active" | "Blocked";
  adminType: "EventOffice" | "Admin";
  createdAt: string;
  updatedAt: string;
}
```

**Functions:**

- `fetchEventsOfficeAccounts()` - GET all accounts
- `createEventsOfficeAccount(data)` - POST new account
- `updateEventsOfficeAccount(id, data)` - PATCH update account
- `deleteEventsOfficeAccount(id)` - DELETE remove account

### 2. Page Component (app/(authenticated)/admin/events-office/page.tsx)

**Features:**

- **DataGrid Table** with columns:
  - Name (firstName + lastName with email below)
  - Role (displays "Events Office")
  - Created (formatted date with sorting)
  - Actions (Edit & Delete icons)

- **Create Dialog:**
  - Fields: First Name, Last Name, Email, Password
  - Validation: All fields required, password minimum 8 characters
  - Auto-sets adminType to "EventOffice"

- **Edit Dialog:**
  - Fields: First Name, Last Name, Email
  - Pre-filled with current values
  - Password not editable (keeps existing)

- **Delete Confirmation Dialog:**
  - Shows account name
  - Warns action is permanent
  - Red delete button for emphasis

- **State Management:**
  - React Query for data fetching with caching
  - Auto-refresh after mutations
  - Optimistic UI updates
  - Success/error snackbar notifications

- **Error Handling:**
  - Network errors detected and user-friendly messages shown
  - Empty state displayed when no accounts exist
  - Warning alert for endpoint issues instead of harsh error

## Authentication & Authorization

All endpoints require:

1. Valid JWT token (via `loginRequired` middleware)
2. Admin role (via `@AdminRequired()` decorator)

## Validation

**Backend:**

- Email format validation
- Password minimum 8 characters
- Duplicate email check
- Cannot delete self
- Name fields cannot be empty

**Frontend:**

- All fields required for creation
- Email field type="email"
- Password helper text
- Loading states during operations

## API Request/Response Examples

### Create Account

```typescript
POST /admin/events-office
Body: {
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@university.edu",
  password: "secure123"
}

Response: {
  success: true,
  message: "Events Office account created successfully",
  account: {
    id: "...",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@university.edu",
    status: "Active",
    adminType: "EventOffice",
    createdAt: "2025-10-18T...",
    updatedAt: "2025-10-18T..."
  }
}
```

### Update Account

```typescript
PATCH /admin/events-office/:id
Body: {
  firstName: "Jane",
  email: "jane.doe@university.edu"
}

Response: {
  success: true,
  message: "Events Office account updated successfully",
  account: { /* updated account */ }
}
```

### Delete Account

```typescript
DELETE /admin/events-office/:id

Response: {
  success: true,
  message: "Events Office account deleted successfully"
}
```

## Testing Checklist

- [x] Backend service methods compile without errors
- [x] Backend controller methods added
- [x] Routes registered correctly
- [x] Frontend interface matches backend response
- [x] Frontend API functions call correct endpoints
- [x] Page component has all CRUD dialogs
- [x] DataGrid columns configured properly
- [x] Form validation implemented
- [x] Error handling in place
- [ ] Create account via UI (requires backend running)
- [ ] Edit account via UI
- [ ] Delete account via UI
- [ ] Test with empty database
- [ ] Test with network error

## Usage

1. Start the backend server
2. Login as an admin user
3. Navigate to "Admin" → "Events Office" in the sidebar
4. Click "Create Account" to add new Events Office staff
5. Use edit icon to modify account details
6. Use delete icon to remove accounts

## Notes

- Events Office accounts are stored in the same collection as regular admins
- They are filtered by `adminType === "EventOffice"`
- Password cannot be changed via edit (security feature)
- Accounts must be created with a password
- Self-deletion is prevented for safety
