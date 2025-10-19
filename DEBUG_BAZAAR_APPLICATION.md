# Debug Guide: Bazaar Application Submission Issue

## Recent Changes Made

### 1. Fixed API Endpoint (CRITICAL FIX)

- ✅ Changed `/vendor/...` to `/vendors/...` (plural) in all files
- This matches the backend route mounting: `api.use("/vendors", vendorRoutes)`

### 2. Added Comprehensive Logging

#### Frontend Logging (`bazaars/page.tsx`)

The following will appear in **browser console**:

```
=== Submitting Application ===
Request Body: { eventId, attendees, boothSize, vendorEmail, companyName }
Token: Present/Missing
Response: { success, message, data }
```

#### Backend Controller Logging (`vendorController.ts`)

The following will appear in **server terminal**:

```
=== Apply to Bazaar Request ===
Vendor ID: <vendorId>
Request Body: { full JSON }
Built attendees array: [{ name, email }, ...]
Service result: { success, message, data }
```

#### Backend Service Logging (`vendorService.ts`)

The following will appear in **server terminal**:

```
=== applyToBazaar Service Called ===
vendorId: <id>
applicationData: { full JSON }
Event found: <name> Type: <type>
Prepared application: { full JSON }
Attempting to save application to vendor: <id>
Application saved successfully! / Error messages
```

## How to Debug

### Step 1: Open Browser Console

1. Press `F12` or right-click → "Inspect"
2. Go to "Console" tab
3. Clear the console

### Step 2: Open Server Terminal

1. Make sure the server is running (`npm run dev`)
2. Watch for console output

### Step 3: Try to Apply to a Bazaar

1. Login as a vendor
2. Go to Bazaars page
3. Click "Apply Now" on any bazaar
4. Fill in:
   - **Attendees**: 1-5 (number only)
   - **Booth Size**: Any positive number (e.g., 10)
5. Click "Submit"

### Step 4: Check Logs

#### If you see "Company name is required" error:

**Problem**: Vendor profile not loaded
**Solution**:

- Go to Profile page first
- Make sure company name is filled
- Go back to Bazaars page

#### If you see network error in browser:

**Check**:

- Is server running on port 4000?
- Open Network tab in browser
- Look for the request to `/api/vendors/apply-bazaar`
- Check status code and response

#### Common Error Messages and Solutions:

| Error Message                                    | Cause                 | Solution                              |
| ------------------------------------------------ | --------------------- | ------------------------------------- |
| "eventId, attendees, and boothSize are required" | Missing form fields   | Fill all fields                       |
| "Maximum 5 attendees allowed"                    | Too many attendees    | Enter 1-5                             |
| "Event not found"                                | Invalid event ID      | Check bazaar exists                   |
| "Event is not a bazaar"                          | Wrong event type      | Use actual bazaar event               |
| "At least 1 attendee is required"                | Empty attendees array | Backend build issue - check logs      |
| "Vendor not found"                               | Invalid vendor ID     | Check authentication                  |
| "Already applied for this bazaar"                | Duplicate application | Already applied                       |
| "Internal server error"                          | Server crash          | Check server terminal for stack trace |

## Expected Flow (When Working)

### 1. Frontend Console:

```
=== Submitting Application ===
Request Body: {
  "eventId": "507f1f77bcf86cd799439011",
  "attendees": 3,
  "boothSize": 10,
  "vendorEmail": "vendor@example.com",
  "companyName": "My Company"
}
Token: Present
Response: {
  "success": true,
  "message": "Application submitted successfully",
  "data": {...}
}
```

### 2. Server Terminal:

```
=== Apply to Bazaar Request ===
Vendor ID: 507f1f77bcf86cd799439011
Request Body: {
  "eventId": "507f1f77bcf86cd799439012",
  "attendees": 3,
  "boothSize": 10,
  "vendorEmail": "vendor@example.com",
  "companyName": "My Company"
}
Built attendees array: [
  { "name": "My Company", "email": "vendor@example.com" },
  { "name": "My Company", "email": "vendor@example.com" },
  { "name": "My Company", "email": "vendor@example.com" }
]
=== applyToBazaar Service Called ===
vendorId: 507f1f77bcf86cd799439011
Event found: Summer Bazaar Type: bazaar
Prepared application: {...}
Attempting to save application to vendor: 507f1f77bcf86cd799439011
Application saved successfully!
Service result: {
  "success": true,
  "message": "Application submitted successfully"
}
```

### 3. Browser UI:

- Green success snackbar: "Application submitted successfully!"
- Dialog closes
- Form resets

## What to Send Me

If it still doesn't work, please copy and paste:

1. **Browser console output** (everything after clicking Submit)
2. **Server terminal output** (everything after clicking Submit)
3. **Network tab** (the request/response for `/api/vendors/apply-bazaar`)
4. **Any error messages** shown in the UI

## Quick Checklist

- [ ] Server is running on port 4000
- [ ] Frontend is running on port 3000 or 3001
- [ ] Logged in as a vendor
- [ ] Vendor profile has company name
- [ ] Bazaar event exists in database
- [ ] Network request goes to `/api/vendors/apply-bazaar` (with 's')
- [ ] Request includes all required fields
- [ ] Token is present in request headers

## Files Changed

1. `server/controllers/vendorController.ts` - Added logging, fixed body access
2. `server/services/vendorService.ts` - Added comprehensive logging
3. `app/(authenticated)/vendor/bazaars/page.tsx` - Fixed endpoint, added logging
4. `lib/services/vendor.ts` - Fixed profile endpoints
5. `app/(authenticated)/vendor/profile/page.tsx` - Fixed profile update endpoint
