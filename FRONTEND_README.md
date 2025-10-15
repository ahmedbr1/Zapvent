# Zapvent - University Event Management System

A comprehensive event management platform for German University in Cairo (GUC), built with Next.js 15 and Material-UI.

## 🚀 Features

### Multi-Role System

#### 👨‍🎓 Students/Staff

- Browse and search university events
- Filter by event type (Workshop, Seminar, Conference, Trip, Bazaar)
- Register for events with capacity management
- View personal bookings and event details
- Access gym sessions and sports facilities

#### 👨‍💼 Admin

- Manage all users (block, unblock, delete)
- Approve/reject vendor applications
- Monitor system activity
- Oversee user and vendor status

#### 📅 Events Office

- Create and manage events (Bazaars, Trips, Workshops, etc.)
- Set event details (dates, capacity, pricing, location)
- Manage funding sources and budgets
- Track event registrations
- Archive past events

#### 🏪 Vendors

- Register business with required documents
- Apply to participate in bazaars
- Track application status (pending, approved, rejected)
- View application statistics
- Manage booth information

## 🛠️ Tech Stack

### Frontend

- **Framework**: Next.js 15 (App Router)
- **UI Library**: Material-UI v6
- **Language**: TypeScript
- **Styling**: Material-UI + Tailwind CSS
- **Date Handling**: Day.js with MUI Date Pickers
- **State Management**: React Context API
- **HTTP Client**: Fetch API

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (httpOnly cookies)
- **Validation**: Zod
- **Language**: TypeScript

## 📁 Project Structure

```
Zapvent/
├── app/
│   ├── admin/
│   │   └── dashboard/          # Admin management dashboard
│   ├── auth/
│   │   ├── login/[role]/       # Dynamic login pages
│   │   └── register/
│   │       ├── user/           # User registration
│   │       └── vendor/         # Vendor registration
│   ├── components/
│   │   ├── DashboardLayout.tsx
│   │   ├── EventCard.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── StatusChip.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx     # Global auth state
│   ├── events-office/
│   │   └── dashboard/          # Event creation dashboard
│   ├── student/
│   │   └── dashboard/          # Event browsing dashboard
│   ├── vendor/
│   │   └── dashboard/          # Bazaar applications dashboard
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Landing page
│   └── globals.css
├── lib/
│   ├── api.ts                  # API client functions
│   ├── theme.ts                # MUI theme configuration
│   └── types.ts                # TypeScript interfaces
├── server/
│   ├── controllers/            # Request handlers
│   ├── models/                 # Mongoose schemas
│   ├── routes/                 # API routes
│   └── services/               # Business logic
└── public/                     # Static assets
```

## 🎨 Design System

### Colors

- **Primary**: Deep Blue (#003366) - University brand color
- **Secondary**: Gold (#FFD700) - Accent color
- **Error**: Red for alerts and warnings
- **Success**: Green for approvals
- **Warning**: Orange for pending states

### Typography

- System fonts for optimal performance
- Consistent heading hierarchy (h1-h6)
- Body text optimized for readability

### Components

- Material Design principles
- Responsive grid system
- Accessible forms and inputs
- Interactive data tables
- Status chips with color coding

## 🔐 Authentication Flow

1. **Landing Page**: User selects role (Student/Staff, Admin, Events Office, Vendor)
2. **Login**: Role-specific login with email/password
3. **Registration**: Multi-step forms for User and Vendor
4. **Protected Routes**: Automatic redirection based on authentication
5. **JWT Tokens**: Stored in httpOnly cookies for security
6. **Role-Based Access**: Different dashboards per user type

## 📦 Installation

### Prerequisites

- Node.js 18+
- MongoDB 4.4+
- npm or yarn

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/ahmedbr1/Zapvent.git
   cd Zapvent
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Variables**
   Create a `.env` file in the root directory:

   ```env
   # MongoDB
   MONGODB_URI=mongodb://localhost:27017/zapvent

   # JWT
   JWT_SECRET=your-super-secret-jwt-key-change-this

   # Server
   PORT=4000
   ```

4. **Install MUI dependencies** (if not already installed)

   ```bash
   npm install @mui/material @mui/icons-material @emotion/react @emotion/styled @mui/material-nextjs @mui/x-date-pickers dayjs axios react-hook-form @hookform/resolvers
   ```

5. **Start MongoDB**

   ```bash
   # Make sure MongoDB is running
   mongod
   ```

6. **Run the development servers**

   Terminal 1 - Backend:

   ```bash
   cd server
   npm run dev
   ```

   Terminal 2 - Frontend:

   ```bash
   npm run dev
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000/api

## 🔑 Default Credentials

### Admin

- Email: `admin@guc.edu.eg`
- Password: `admin123`

### Events Office (Admin)

- Email: `events@guc.edu.eg`
- Password: `events123`

_Note: Create these accounts manually in MongoDB or through the backend API_

## 🌐 API Endpoints

### Authentication

- `POST /api/auth/login/user` - User login
- `POST /api/auth/login/admin` - Admin login
- `POST /api/auth/login/vendor` - Vendor login
- `POST /api/auth/register/user` - User registration
- `POST /api/auth/register/vendor` - Vendor registration
- `POST /api/auth/logout` - Logout

### Events

- `GET /api/events` - Get all events
- `GET /api/events/upcoming-bazaars` - Get upcoming bazaars
- `POST /api/events/bazaar` - Create bazaar (Admin)
- `POST /api/events/trip` - Create trip (Admin)
- `PUT /api/events/:id` - Update event (Admin)
- `DELETE /api/events/:id` - Delete event (Admin)

### Users

- `GET /api/users` - Get all users (Admin)
- `PUT /api/users/:id/block` - Block user (Admin)
- `PUT /api/users/:id/unblock` - Unblock user (Admin)
- `DELETE /api/users/:id` - Delete user (Admin)

### Vendors

- `GET /api/vendors` - Get all vendors (Admin)
- `PUT /api/vendors/:id/approve` - Approve vendor (Admin)
- `PUT /api/vendors/:id/reject` - Reject vendor (Admin)
- `POST /api/vendors/apply-bazaar` - Apply to bazaar
- `GET /api/vendors/my-applications` - Get my applications

## 🎯 User Workflows

### Student Registration & Event Browsing

1. Click "Student/Staff" on landing page
2. Click "Register here"
3. Complete 3-step registration form:
   - Personal Info (name, phone)
   - Account Details (email, password)
   - University Info (role, faculty, student ID)
4. Login with credentials
5. Browse events with search and filters
6. Register for events

### Vendor Application Process

1. Click "Vendor" on landing page
2. Click "Register here"
3. Complete 3-step registration:
   - Business Info
   - Account Details
   - Documents (commercial registration, tax card)
4. Wait for admin approval
5. Once approved, apply to bazaars
6. Track application status

### Admin User Management

1. Login as admin
2. View Users tab
3. Block/unblock/delete users
4. Switch to Vendors tab
5. Approve/reject vendor applications

### Events Office Event Creation

1. Login as events office
2. Fill event creation form:
   - Basic info (name, description, type)
   - Dates (start, end, registration deadline)
   - Details (location, capacity, price, budget)
   - Additional info (website, agenda)
3. Submit to create event
4. Event appears in student event browser

## 🧪 Testing

```bash
# Run frontend tests
npm test

# Run backend tests
cd server
npm test

# Run E2E tests
npm run test:e2e
```

## 📈 Future Enhancements

- [ ] Email notifications for events
- [ ] Payment integration for paid events
- [ ] Calendar integration
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Event feedback and ratings
- [ ] Real-time notifications
- [ ] Chat support
- [ ] QR code ticketing
- [ ] Social media integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Developer**: Ahmed Badr
- **University**: German University in Cairo
- **Course**: Advanced Computer Lab I
- **Semester**: 7 (Berlin)

## 📧 Contact

For questions or support, please contact:

- Email: support@zapvent.com
- GitHub Issues: https://github.com/ahmedbr1/Zapvent/issues

---

Made with ❤️ at GUC Berlin
