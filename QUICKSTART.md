# Zapvent - Quick Start Guide

## 🚀 Get Up and Running in 5 Minutes

### Step 1: Install Dependencies

```bash
# Install all dependencies
npm install

# Install MUI and additional packages (if not already installed)
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled @mui/material-nextjs @mui/x-date-pickers dayjs axios react-hook-form @hookform/resolvers
```

### Step 2: Configure Environment

Create a `.env` file in the root directory:

```env
MONGODB_URI=mongodb://localhost:27017/zapvent
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=4000
```

### Step 3: Start MongoDB

```bash
# Windows
mongod

# Mac/Linux
sudo systemctl start mongod
```

### Step 4: Run the Application

**Terminal 1 - Backend Server:**

```bash
cd server
npm run dev
```

Server will start at http://localhost:4000

**Terminal 2 - Frontend (Next.js):**

```bash
npm run dev
```

Frontend will start at http://localhost:3000

### Step 5: Access the Application

Open your browser and navigate to: **http://localhost:3000**

## 🎭 Test Accounts

### Create Admin Account (via MongoDB)

```javascript
// In MongoDB shell or Compass
use zapvent

db.admins.insertOne({
  email: "admin@guc.edu.eg",
  password: "$2b$10$...", // Use bcrypt to hash "admin123"
  name: "Admin User",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### Register as Student

1. Go to http://localhost:3000
2. Click "Student/Staff"
3. Click "Register here"
4. Fill in the form and submit

### Register as Vendor

1. Go to http://localhost:3000
2. Click "Vendor"
3. Click "Register here"
4. Complete the multi-step form with business details

## 📋 Common Commands

### Development

```bash
# Start frontend dev server
npm run dev

# Start backend dev server
cd server && npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Database

```bash
# Connect to MongoDB shell
mongosh

# Use zapvent database
use zapvent

# View collections
show collections

# View users
db.users.find()
```

### Debugging

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check for errors
npm run lint
```

## 🔍 Troubleshooting

### "Cannot connect to MongoDB"

- Ensure MongoDB is running: `mongod`
- Check MONGODB_URI in .env file
- Verify MongoDB is listening on port 27017

### "Module not found: @mui/material"

```bash
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
```

### "Port 3000 already in use"

```bash
# Kill the process using port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill
```

### "JWT verification failed"

- Clear browser cookies
- Restart the backend server
- Check JWT_SECRET in .env

## 🎯 Quick Feature Tour

### 1. Landing Page

- Beautiful gradient background with university colors
- 4 role cards: Student/Staff, Admin, Events Office, Vendor
- Responsive design works on all devices

### 2. Login Pages

- Dynamic routing: `/auth/login/[role]`
- Password visibility toggle
- Form validation
- Error handling

### 3. Student Dashboard

- Browse all events
- Search by name/description
- Filter by event type
- Responsive grid layout
- Event registration

### 4. Admin Dashboard

- User management table
- Vendor approval system
- Block/unblock users
- Confirmation dialogs

### 5. Events Office Dashboard

- Comprehensive event creation form
- Date pickers for event dates
- Location and faculty selection
- Budget and pricing management

### 6. Vendor Dashboard

- Application statistics
- Upcoming bazaars list
- Apply to bazaars
- Status tracking

## 📚 Next Steps

1. **Customize Theme**: Edit `lib/theme.ts` to match your branding
2. **Add Features**: Extend functionality in respective dashboard pages
3. **Connect Backend**: Ensure all API endpoints match your backend routes
4. **Test Thoroughly**: Try all user flows and edge cases
5. **Deploy**: Use Vercel for frontend, MongoDB Atlas for database

## 🆘 Need Help?

- **Documentation**: See [FRONTEND_README.md](./FRONTEND_README.md)
- **Backend Docs**: Check `server/README.md`
- **Issues**: https://github.com/ahmedbr1/Zapvent/issues
- **Email**: support@zapvent.com

---

Happy coding! 🎉
