# Zapvent - Setup Instructions

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v18 or higher)
2. **MongoDB** (running locally or connection string)
3. **npm** or **yarn**

### Setup Steps

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create environment file**
   Copy the example file and configure it:

   ```bash
   cp .env.example .env
   ```

3. **Configure `.env` file**
   Edit `.env` and set these required variables:

   ```env
   MONGODB_URI=mongodb://localhost:27017/zapvent
   JWT_SECRET=your-secret-key-here
   JWT_EXPIRES_IN=86400
   ENCRYPTION_SALT_ROUNDS=10
   ```

4. **Start MongoDB**
   Make sure MongoDB is running:
   - **Windows**: Start MongoDB service
   - **Mac/Linux**: `mongod` or check system service

5. **Run the development server**
   ```bash
   npm run dev
   ```
   This starts both:
   - Frontend (Next.js): http://localhost:3000
   - Backend (Express): http://localhost:4000

### Troubleshooting

#### "Failed to fetch" error when logging in

This means the backend server isn't running. Check:

1. Is MongoDB running?
2. Is the `.env` file configured?
3. Are both servers running? You should see:
   - `✅ API listening on :4000`
   - `✅ MongoDB connected`

#### Port already in use

Kill the process using the port:

```bash
# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess | Stop-Process

# Kill port 3000 if needed
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
```

#### MongoDB connection errors

- Verify MongoDB is running: `mongosh` (should connect)
- Check your `MONGODB_URI` in `.env`
- Default local URI: `mongodb://localhost:27017/zapvent`

### Testing the Setup

1. **Check backend health**

   ```bash
   curl http://localhost:4000/api/health
   ```

   Should return: `{"ok":true}`

2. **Try user registration**
   - Navigate to: http://localhost:3000/register/user
   - Fill in the form with student details
   - Submit and check for success message

## 📁 Project Structure

- `/app` - Next.js frontend pages
- `/components` - React components
- `/server` - Express backend
  - `/controllers` - Request handlers
  - `/services` - Business logic
  - `/models` - MongoDB models
  - `/routes` - API routes
- `/lib` - Shared utilities

## 🔑 Default Test Accounts

After seeding (if applicable):

- **Student**: Check your registered email
- **Admin**: Contact system administrator

## 📝 Development Notes

- Frontend runs on port **3000**
- Backend API runs on port **4000**
- MongoDB default port **27017**
- JWT tokens expire in 24 hours (configurable)
