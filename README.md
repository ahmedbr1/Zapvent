# 🎓 Zapvent - University Event Management System

> A comprehensive event management platform for German University in Cairo (GUC)

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Material-UI](https://img.shields.io/badge/Material--UI-6-blue)](https://mui.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4.4+-green)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📖 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Project Structure](#project-structure)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [License](#license)

## 🌟 Overview

Zapvent is a full-stack event management system designed specifically for universities. It enables students, staff, administrators, and vendors to seamlessly organize, manage, and participate in campus events, bazaars, trips, workshops, and more.

### Key Highlights

- 🎯 **Multi-Role System**: 4 distinct user roles with tailored dashboards
- 🎨 **Beautiful UI**: Material Design with university branding
- 📱 **Responsive**: Works flawlessly on desktop, tablet, and mobile
- 🔒 **Secure**: JWT authentication with role-based access control
- ⚡ **Fast**: Next.js 15 with App Router for optimal performance
- 🎓 **University-Focused**: Built specifically for campus event management

## ✨ Features

### 👨‍🎓 For Students & Staff

- Browse and search all university events
- Filter events by type, location, and date
- Register for events with one click
- View personal bookings and history
- Book gym sessions and sports facilities
- Submit complaints and feedback

### 👨‍💼 For Administrators

- Manage all users (approve, block, delete)
- Review and approve vendor applications
- Monitor system activity and statistics
- Oversee event operations
- Generate reports (coming soon)

### 📅 For Events Office

- Create and manage all types of events
- Set capacity limits and pricing
- Track registrations in real-time
- Manage event budgets and funding
- Archive completed events

### 🏪 For Vendors

- Register business with required documentation
- Apply to participate in university bazaars
- Track application status
- View statistics and analytics
- Manage booth information

## 🛠️ Tech Stack

### Frontend

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **UI Library**: [Material-UI v6](https://mui.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: MUI + Tailwind CSS
- **State**: React Context API
- **Forms**: React Hook Form
- **Dates**: Day.js + MUI Date Pickers

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Auth**: JWT (httpOnly cookies)
- **Validation**: Zod
- **Language**: TypeScript

## 🚀 Quick Start

### Prerequisites

```bash
Node.js 18+
MongoDB 4.4+
npm or yarn
```

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/ahmedbr1/Zapvent.git
   cd Zapvent
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Install MUI packages**

   ```bash
   npm install @mui/material @mui/icons-material @emotion/react @emotion/styled @mui/material-nextjs @mui/x-date-pickers dayjs axios react-hook-form @hookform/resolvers
   ```

4. **Configure environment**

   Create `.env` file:

   ```env
   MONGODB_URI=mongodb://localhost:27017/zapvent
   JWT_SECRET=your-super-secret-jwt-key
   PORT=4000
   ```

5. **Start MongoDB**

   ```bash
   mongod
   ```

6. **Run the application**

   Terminal 1 (Backend):

   ```bash
   cd server
   npm run dev
   ```

   Terminal 2 (Frontend):

   ```bash
   npm run dev
   ```

7. **Access the app**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:4000/api

## 📚 Documentation

- [📖 Frontend Documentation](FRONTEND_README.md) - Complete feature guide
- [⚡ Quick Start Guide](QUICKSTART.md) - 5-minute setup
- [📋 Implementation Summary](IMPLEMENTATION_SUMMARY.md) - Technical overview
- [🔧 API Documentation](server/API.md) - Backend endpoints

## 📁 Project Structure

```
Zapvent/
├── app/                      # Next.js App Router
│   ├── admin/               # Admin dashboard
│   ├── auth/                # Authentication pages
│   ├── components/          # Reusable components
│   ├── contexts/            # React contexts
│   ├── events-office/       # Events office dashboard
│   ├── student/             # Student dashboard
│   ├── vendor/              # Vendor dashboard
│   └── layout.tsx           # Root layout
├── lib/                     # Utilities
│   ├── api.ts              # API client
│   ├── theme.ts            # MUI theme
│   └── types.ts            # TypeScript types
├── server/                  # Backend
│   ├── controllers/        # Request handlers
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API routes
│   └── services/           # Business logic
└── public/                 # Static assets
```

## 🎨 Screenshots

### Landing Page

Beautiful role-based entry point with university branding.

### Student Dashboard

Browse events with powerful search and filtering.

### Admin Dashboard

Comprehensive user and vendor management.

### Events Office

Create and manage events with ease.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

**Ahmed Badr**

- University: German University in Cairo
- Course: Advanced Computer Lab I
- Semester: 7 (Berlin)

## 🙏 Acknowledgments

- German University in Cairo
- Material-UI Team
- Next.js Team
- All contributors and testers

## 📧 Contact & Support

- **Email**: support@zapvent.com
- **GitHub Issues**: [Report a bug](https://github.com/ahmedbr1/Zapvent/issues)
- **Documentation**: [Read the docs](FRONTEND_README.md)

---

<p align="center">Made with ❤️ at GUC Berlin</p>
<p align="center">© 2024 Zapvent. All rights reserved.</p>
