# Bazaar Application System Fixes

## Summary

Fixed three critical issues with the vendor bazaar application system:

1. ✅ **Capacity Management** - Bazaar capacity now decreases when vendors apply
2. ✅ **Application History** - Vendors can view all their applications
3. ✅ **Duplicate Prevention** - Can't apply twice to the same bazaar

---

## Changes Made

### 1. Backend Updates

#### `server/services/vendorService.ts`

- **Added capacity update** after successful application:

  ```typescript
  // Decrease event capacity by number of attendees
  await EventModel.findByIdAndUpdate(applicationData.eventId, {
    $inc: { capacity: -numAttendees },
  });
  ```

- **Added `getVendorApplications()` function**:
  - Fetches all applications for a vendor
  - Populates event details (name, date, location, type)
  - Returns formatted data with application status

#### `server/controllers/vendorController.ts`

- **Added `getMyApplications()` method**:
  - Protected route (requires Vendor role)
  - Returns vendor's applications with event details
  - Handles errors gracefully

- **Added enhanced logging** for debugging:
  - Token extraction logging
  - Authentication verification logging
  - Request body logging
  - User info logging

#### `server/routes/vendorRoutes.ts`

- **Added authentication middleware** to `/apply-bazaar` route:

  ```typescript
  router.post(
    "/apply-bazaar",
    loginRequired,
    allowedRoles(["Vendor"]),
    vendorController.applyToBazaar.bind(vendorController)
  );
  ```

- **Added new route** `/my-applications`:
  ```typescript
  router.get(
    "/my-applications",
    loginRequired,
    allowedRoles(["Vendor"]),
    vendorController.getMyApplications.bind(vendorController)
  );
  ```

#### `server/middleware/authMiddleware.ts`

- **Enhanced logging** in token extraction:
  - Logs authorization header presence
  - Logs token extraction success/failure
  - Logs token verification results
  - Logs decoded user information

### 2. Frontend Updates

#### `app/(authenticated)/vendor/applications/page.tsx`

- **Connected to real API**:
  - Changed from placeholder to actual API call
  - Fetches from `/vendors/my-applications`
  - Displays all vendor applications in table
  - Shows: Event name, date, attendees, booth size, location, status

- **Added proper types**:
  ```typescript
  interface VendorApplication {
    id: string;
    eventId: string;
    eventName: string;
    eventDate?: string;
    eventLocation?: string;
    applicationDate: string;
    attendees: number;
    boothSize: number;
    boothLocation?: string;
    status: "pending" | "approved" | "rejected";
  }
  ```

#### `app/(authenticated)/vendor/bazaars/page.tsx`

- **Added duplicate check**:
  - Fetches vendor's applications on page load
  - Checks if already applied using `hasApplied()` function
  - Disables "Apply" button for already-applied bazaars
  - Shows "Already Applied" badge and button text

- **Enhanced UI feedback**:
  - Green "Already Applied" chip on bazaar cards
  - Disabled button for applied bazaars
  - Button text changes to "Already Applied"
  - Refetches applications after successful submission

- **Visual indicators**:
  ```tsx
  {
    hasApplied(bazaar.id) && (
      <Chip label="Already Applied" size="small" color="success" />
    );
  }
  ```

---

## How It Works

### Application Flow

1. **Vendor browses bazaars** → See all available bazaars
2. **Check if already applied** → Frontend queries `/my-applications`
3. **Click "Apply Now"** → Opens application dialog
4. **Submit application** → POST to `/apply-bazaar`
5. **Backend processes**:
   - Validates event exists and is a bazaar
   - Checks for duplicate (atomic operation)
   - Saves application to vendor document
   - **Decreases event capacity by number of attendees**
6. **Frontend updates**:
   - Shows success message
   - Refetches bazaars list (shows updated capacity)
   - Refetches applications (shows new application)
   - Bazaar now shows "Already Applied"

### Duplicate Prevention

- **Database level**: Uses `findOneAndUpdate` with `$ne` condition:
  ```typescript
  await vendorModel.findOneAndUpdate(
    {
      _id: vendorId,
      "applications.eventId": { $ne: eventId }, // Must NOT already have this eventId
    },
    { $push: { applications: newApplication } }
  );
  ```
- **UI level**: Disables button if `hasApplied(bazaarId)` returns true

### Capacity Management

- **Initial capacity**: Set when event is created (e.g., 50 vendors)
- **After application**: Capacity decreases by number of attendees
  - Example: Vendor applies with 3 attendees → capacity: 50 → 47
- **Display**: Shows "X/50" on bazaar cards
- **Full bazaar**: Shows "Full" badge when capacity reaches 0

---

## Testing Checklist

### ✅ Test 1: Apply to Bazaar

1. Login as vendor
2. Go to "Browse Bazaars"
3. Click "Apply Now" on a bazaar
4. Fill in attendees (1-5) and booth size
5. Submit
6. **Expected**:
   - Success message
   - Bazaar capacity decreases
   - Button changes to "Already Applied"
   - Green chip appears

### ✅ Test 2: View Applications

1. Go to "My Applications" page
2. **Expected**:
   - See all submitted applications
   - Shows event name, date, attendees, status
   - Status chips (Pending/Approved/Rejected)

### ✅ Test 3: Prevent Duplicates

1. Try to apply to the same bazaar again
2. **Expected**:
   - Button is disabled
   - Shows "Already Applied"
   - Cannot submit duplicate

### ✅ Test 4: Capacity Updates

1. Note initial capacity (e.g., "0/50")
2. Apply with 3 attendees
3. **Expected**:
   - Capacity shows "3/50"
   - Each application decreases capacity

---

## API Endpoints

### GET `/api/vendors/my-applications`

**Auth**: Required (Vendor role)

**Response**:

```json
{
  "success": true,
  "message": "Applications retrieved successfully",
  "data": [
    {
      "id": "app_id",
      "eventId": "event_id",
      "eventName": "Spring Bazaar 2024",
      "eventDate": "2024-03-15T00:00:00.000Z",
      "eventLocation": "Main Campus",
      "applicationDate": "2024-01-10T12:00:00.000Z",
      "status": "pending",
      "attendees": 3,
      "boothSize": 10,
      "boothLocation": "TBD"
    }
  ]
}
```

### POST `/api/vendors/apply-bazaar`

**Auth**: Required (Vendor role)

**Request Body**:

```json
{
  "eventId": "event_id",
  "attendees": 3,
  "boothSize": 10,
  "vendorEmail": "vendor@example.com",
  "companyName": "My Company"
}
```

**Response** (Success):

```json
{
  "success": true,
  "message": "Application submitted successfully",
  "data": {
    /* application object */
  }
}
```

**Response** (Duplicate):

```json
{
  "success": false,
  "message": "Already applied for this bazaar"
}
```

---

## Database Schema

### Vendor.applications

```typescript
{
  eventId: ObjectId,
  status: "pending" | "approved" | "rejected",
  applicationDate: Date,
  attendees: [
    { name: String, email: String }
  ],
  boothSize: Number,
  boothInfo: {
    boothLocation?: String,
    boothStartTime?: Date,
    boothEndTime?: Date
  }
}
```

### Event Model

```typescript
{
  name: String,
  eventType: "Bazaar",
  capacity: Number, // Decreases when vendors apply
  // ... other fields
}
```

---

## Files Modified

### Backend

- ✅ `server/services/vendorService.ts` - Added capacity update & getVendorApplications
- ✅ `server/controllers/vendorController.ts` - Added getMyApplications method
- ✅ `server/routes/vendorRoutes.ts` - Added auth middleware & new route
- ✅ `server/middleware/authMiddleware.ts` - Enhanced logging

### Frontend

- ✅ `app/(authenticated)/vendor/applications/page.tsx` - Connected to API
- ✅ `app/(authenticated)/vendor/bazaars/page.tsx` - Added duplicate check

---

## Next Steps (Optional Enhancements)

1. **Email Notifications**
   - Send email when application is approved/rejected
   - Remind vendors of upcoming bazaars

2. **Application Editing**
   - Allow vendors to edit pending applications
   - Update attendees/booth size before approval

3. **Admin Dashboard**
   - View all applications
   - Approve/reject in bulk
   - Assign booth locations

4. **Capacity Rollback**
   - If application is rejected, add capacity back
   - Handle cancellations

5. **Payment Integration**
   - Require deposit for booth reservation
   - Payment status tracking
