# Admin Vendor Management System

## 🎯 Overview

Complete admin panel for managing vendor accounts and their bazaar applications with verification workflow, application approval/rejection, and detailed views.

---

## ✨ Features Implemented

### 1. **Vendor Account Verification**

- ✅ Added `verified` boolean field to Vendor model
- ✅ Added `verificationStatus` enum field (PENDING, APPROVED, REJECTED)
- ✅ Admin can approve or reject vendor accounts
- ✅ Visual status indicators with color-coded chips

### 2. **Enhanced Vendor List View** (`/admin/vendors`)

- **New Columns**:
  - ✅ Account Status (Pending/Approved/Rejected)
  - ✅ Pending Applications count
  - ✅ Approved Applications count
  - ✅ Rejected Applications count
  - ✅ Actions column with buttons

- **Actions Available**:
  - 👁️ **View Applications** - Navigate to detailed vendor page
  - ✅ **Approve Account** - Only for pending vendors
  - ❌ **Reject Account** - Only for pending vendors

### 3. **Detailed Vendor Applications Page** (`/admin/vendors/[vendorId]/applications`)

- **Vendor Information Card**:
  - Company name
  - Email address
  - Join date
  - Loyalty forum link
  - Current verification status

- **Applications Summary Card**:
  - Pending applications count (yellow)
  - Approved applications count (green)
  - Rejected applications count (red)

- **Applications Table**:
  - Event ID (truncated)
  - Application date
  - Number of attendees
  - Booth size
  - Booth location
  - Status chip (color-coded)
  - **Actions**: Approve/Reject buttons for pending applications

---

## 🗄️ Database Schema Changes

### Vendor Model (`server/models/Vendor.ts`)

```typescript
export interface IVendor extends IBaseModel {
  email: string;
  password: string;
  companyName: string;
  documents?: string;
  logo?: string;
  taxCard?: string;
  verified: boolean; // NEW: Account verification flag
  verificationStatus: VendorStatus; // NEW: Pending/Approved/Rejected
  applications?: BazaarApplication[];
  loyaltyForum?: string;
}

const vendorSchema = new Schema<IVendor>({
  // ... existing fields
  verified: { type: Boolean, default: false }, // NEW
  verificationStatus: {
    // NEW
    type: String,
    enum: Object.values(VendorStatus),
    default: VendorStatus.PENDING,
  },
  // ... rest of schema
});
```

---

## 🔌 API Endpoints

### Backend Routes (`server/routes/vendorRoutes.ts`)

```typescript
// Get all vendors for admin
GET /api/vendors/admin

// Approve vendor account
PATCH /api/vendors/admin/:vendorId/approve

// Reject vendor account
PATCH /api/vendors/admin/:vendorId/reject

// Update bazaar application status
PATCH /api/vendors/bazaar-application/status
  Body: { vendorId, eventId, status: "approved" | "rejected" }
```

### Frontend API Functions (`lib/services/admin.ts`)

```typescript
// Approve vendor account
approveVendorAccount(vendorId: string, token?: string)

// Reject vendor account
rejectVendorAccount(vendorId: string, token?: string)

// Update application status
updateVendorApplicationStatus(
  vendorId: string,
  eventId: string,
  status: "approved" | "rejected",
  token?: string
)
```

---

## 🎨 User Interface

### Main Vendors Page (`/admin/vendors`)

```
┌────────────────────────────────────────────────────────────────┐
│ Vendor applications                                            │
│ Review vendor onboarding submissions, monitor verification... │
├────────────────────────────────────────────────────────────────┤
│ [Refresh data] ⟳                                              │
├────────────────────────────────────────────────────────────────┤
│ Company       │Status   │Pend│Appr│Rej│Loyalty │Joined│Actions│
│ ABC Corp      │APPROVED │ 2  │ 5  │ 1 │[Link]  │Oct 15│ 👁️    │
│ vendor@abc    │         │    │    │   │        │      │       │
│───────────────┼─────────┼────┼────┼───┼────────┼──────┼───────│
│ XYZ Ltd       │PENDING  │ 3  │ 0  │ 0 │Not prov│Oct 18│ 👁️✅❌│
│ vendor@xyz    │         │    │    │   │        │      │       │
└────────────────────────────────────────────────────────────────┘
```

### Vendor Detail Page (`/admin/vendors/[vendorId]/applications`)

```
┌────────────────────────────────────────────────────────────────┐
│ ← Back to Vendors                                             │
│                                                                │
│ ABC Corporation                                                │
│ vendor@abc.com                                                 │
│ Account Status: [APPROVED]                                     │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ Vendor Information                                             │
│ Company Name:    ABC Corporation                               │
│ Email:           vendor@abc.com                                │
│ Joined:          Oct 15, 2025 10:30 AM                        │
│ Loyalty Forum:   [Open Link]                                  │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ Applications Summary                                           │
│  3          5            1                                     │
│  Pending    Approved     Rejected                              │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ Bazaar Applications                                            │
├────────────────────────────────────────────────────────────────┤
│ Event ID  │ Date     │Attend│Booth │Location│Status  │Actions │
│ 67ab12... │ Oct 15   │  3   │20 sqm│Hall A  │PENDING │ ✅ ❌  │
│ 89cd34... │ Oct 18   │  5   │25 sqm│Hall B  │APPROVED│        │
│ 45ef56... │ Oct 19   │  2   │15 sqm│TBD     │REJECTED│        │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Workflow

### Vendor Account Verification

```
1. Vendor registers → verificationStatus = "pending"
                   → verified = false

2. Admin reviews vendor in /admin/vendors

3. Admin clicks ✅ Approve:
   → verificationStatus = "approved"
   → verified = true
   → Success notification
   → List refreshes

   OR Admin clicks ❌ Reject:
   → verificationStatus = "rejected"
   → verified = false
   → Success notification
   → List refreshes
```

### Application Approval Workflow

```
1. Vendor applies to bazaar → status = "pending"

2. Admin views vendor's applications page

3. Admin clicks ✅ on application:
   → Application status = "approved"
   → Success notification
   → Table refreshes

   OR Admin clicks ❌ on application:
   → Application status = "rejected"
   → Success notification
   → Table refreshes
```

---

## 🎨 Visual Indicators

### Status Color Coding

| Status   | Color  | Icon | Usage                 |
| -------- | ------ | ---- | --------------------- |
| PENDING  | Yellow | ⏳   | Awaiting admin action |
| APPROVED | Green  | ✅   | Approved by admin     |
| REJECTED | Red    | ❌   | Rejected by admin     |

### Row Highlighting

- 🟡 **Pending applications**: Yellow background (`warning.lighter`)
- ⚪ **Approved/Rejected**: Default background

---

## 📊 Data Flow

### Get Vendors List

```
Frontend (/admin/vendors)
    ↓
GET /api/vendors/admin
    ↓
vendorService.findAllForAdmin()
    ↓
MongoDB Query + Aggregation
    ↓
Return vendors with:
  - verified
  - verificationStatus
  - applications stats
    ↓
Render DataGrid with actions
```

### Approve Vendor Account

```
Admin clicks ✅ Approve
    ↓
approveMutation.mutate(vendorId)
    ↓
PATCH /api/vendors/admin/:vendorId/approve
    ↓
vendorService.approveVendorAccount(vendorId)
    ↓
Update: verified=true, verificationStatus='approved'
    ↓
Invalidate cache & refetch
    ↓
Show success notification
```

### Update Application Status

```
Admin clicks ✅/❌ on application
    ↓
updateStatusMutation.mutate({eventId, status})
    ↓
PATCH /api/vendors/bazaar-application/status
    ↓
vendorController.updateBazaarApplicationStatus()
    ↓
Find vendor & update application.status
    ↓
Invalidate cache & refetch
    ↓
Show success notification
```

---

## 🔒 Security & Permissions

### Authentication Required

- All endpoints require `@LoginRequired()` decorator
- Token passed in Authorization header

### Admin-Only Access

- All vendor management endpoints use `@AllowedRoles(["Admin"])`
- Frontend checks admin role before displaying UI

### Data Protection

- Vendor passwords excluded from responses
- Only necessary fields exposed to admin

---

## ✅ Testing Checklist

### Vendor List Page

- [ ] Page loads without errors
- [ ] All vendors display correctly
- [ ] Verification status chips show correct colors
- [ ] Application counts are accurate
- [ ] Approve button only shows for pending vendors
- [ ] Reject button only shows for pending vendors
- [ ] View Applications button navigates correctly
- [ ] Refresh button works
- [ ] Loading states display properly
- [ ] Error states show appropriate messages

### Vendor Detail Page

- [ ] Page loads with vendor ID
- [ ] Back button navigates to list
- [ ] Vendor information displays correctly
- [ ] Applications summary shows correct counts
- [ ] Applications table populated
- [ ] Pending applications highlighted
- [ ] Approve/Reject buttons only for pending
- [ ] Status updates work correctly
- [ ] Success notifications appear
- [ ] Data refreshes after update

### Account Verification

- [ ] Approving vendor updates status
- [ ] Rejecting vendor updates status
- [ ] Status changes persist in database
- [ ] Action buttons disappear after approval/rejection
- [ ] Optimistic UI updates work
- [ ] Error handling works properly

### Application Management

- [ ] Approving application updates status
- [ ] Rejecting application updates status
- [ ] Status persists in database
- [ ] Action buttons disappear after update
- [ ] Event capacity updates correctly
- [ ] Notifications appear
- [ ] Table refreshes automatically

---

## 🚀 Future Enhancements

1. **Bulk Actions**
   - Select multiple vendors/applications
   - Bulk approve/reject

2. **Filters & Search**
   - Filter by verification status
   - Search by company name/email
   - Filter applications by status

3. **Notifications**
   - Email vendor on account approval/rejection
   - Email vendor on application status change

4. **Audit Log**
   - Track who approved/rejected
   - Timestamp of actions
   - Reason for rejection

5. **Document Review**
   - View uploaded documents (logo, tax card, documents)
   - Inline document viewer
   - Download documents

6. **Communication**
   - Send messages to vendors
   - Request additional information
   - Notes on vendor account

7. **Analytics**
   - Vendor statistics dashboard
   - Application trends
   - Approval rates

---

## 📝 Notes

- **Database Migration**: Existing vendors will have `verified=false` and `verificationStatus='pending'` by default
- **Backwards Compatibility**: All existing functionality preserved
- **Performance**: Consider pagination for vendors with many applications
- **Mobile**: UI is responsive and works on mobile devices

---

## 🐛 Known Issues

None at this time.

---

## 📚 Related Documentation

- [BAZAAR_APPLICATION_FIXES.md](./BAZAAR_APPLICATION_FIXES.md)
- [VENDOR_DASHBOARD_UPDATE.md](./VENDOR_DASHBOARD_UPDATE.md)

---

**Last Updated**: October 19, 2025
