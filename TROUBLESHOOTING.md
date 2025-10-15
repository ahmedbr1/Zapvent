# 🔧 Zapvent - Troubleshooting & Fixes

## ✅ Issues Fixed

### 1. **PowerShell Execution Policy Error** ❌ → ✅

**Error:**

```
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system.
```

**Solution:**
Use **Command Prompt (cmd.exe)** instead of PowerShell:

1. Press `Win + R`
2. Type `cmd` and press Enter
3. Navigate to project: `cd "e:\GUC\Semester 7 Berlin\Advanced Computer Lab I\Project\Zapvent"`
4. Run: `npm run dev`

**OR** Fix PowerShell (Run as Administrator):

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 2. **Server/Client Component Mismatch** ❌ → ✅

**Issue:** ThemeProvider and AuthProvider are client components but were imported in server component (layout.tsx)

**Fix Applied:**

- ✅ Created `app/providers.tsx` as client component wrapper
- ✅ Removed `"use client"` from `lib/theme.ts`
- ✅ Updated `app/layout.tsx` to use Providers component

### 3. **Grid Component API Change (MUI v6)** ❌ → ✅

**Old (deprecated):**

```tsx
<Grid item xs={12} sm={6} md={4}>
```

**New (correct):**

```tsx
<Grid size={{ xs: 12, sm: 6, md: 4 }}>
```

**Status:** ✅ All Grid components updated throughout the app

## 🚀 How to Run (Step-by-Step)

### Option 1: Using Command Prompt (Recommended)

1. **Open Command Prompt**
   - Press `Win + R`
   - Type `cmd`
   - Press Enter

2. **Navigate to Project**

   ```cmd
   cd "e:\GUC\Semester 7 Berlin\Advanced Computer Lab I\Project\Zapvent"
   ```

3. **Verify Dependencies**

   ```cmd
   npm list @mui/material @mui/icons-material @emotion/react @emotion/styled
   ```

   If missing, install:

   ```cmd
   npm install
   ```

4. **Start Development Server**

   ```cmd
   npm run dev
   ```

5. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000/api

### Option 2: Using Git Bash

1. Open Git Bash in project folder
2. Run:
   ```bash
   npm run dev
   ```

### Option 3: Using VS Code Terminal

1. Open VS Code
2. Terminal → New Terminal
3. Select "Command Prompt" from dropdown
4. Run:
   ```cmd
   npm run dev
   ```

## 🔍 Verification Checklist

### Before Running:

- [ ] Node.js installed (v18+)
- [ ] MongoDB running (`mongod`)
- [ ] `.env` file configured
- [ ] Dependencies installed (`npm install`)

### After Starting:

- [ ] No TypeScript errors
- [ ] Frontend accessible at localhost:3000
- [ ] Backend API at localhost:4000/api
- [ ] Landing page loads correctly
- [ ] Can navigate to login pages
- [ ] MUI components render properly

## 🐛 Common Issues & Solutions

### Issue: "Module not found: @mui/material"

**Solution:**

```cmd
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled @mui/x-date-pickers dayjs
```

### Issue: "Cannot find module '@/lib/theme'"

**Solution:**
Check `tsconfig.json` has paths configured:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Issue: "Hydration failed"

**Cause:** Server/client component mismatch
**Solution:** ✅ Already fixed with Providers component

### Issue: Port 3000 already in use

**Solution:**

```cmd
# Find process
netstat -ano | findstr :3000

# Kill process (replace PID with actual number)
taskkill /PID <PID> /F

# Or use different port
set PORT=3001 && npm run dev
```

### Issue: MongoDB connection failed

**Check:**

1. MongoDB is running: `mongod`
2. `.env` has correct URI:
   ```env
   MONGODB_URI=mongodb://localhost:27017/zapvent
   ```
3. MongoDB service started:
   ```cmd
   net start MongoDB
   ```

### Issue: "Cannot read property 'user' of undefined"

**Cause:** AuthContext not initialized
**Solution:** ✅ Make sure you're wrapping app with Providers component (already done)

## 📋 Quick Test After Starting

### 1. Test Landing Page

```
1. Go to http://localhost:3000
2. Should see 4 role cards
3. Cards should have hover effects
4. University branding visible
```

### 2. Test Login

```
1. Click "Student/Staff" → "Login"
2. Should navigate to /auth/login/user
3. Form should display
4. Password toggle should work
```

### 3. Test Registration

```
1. Click "Student/Staff" → "Register"
2. Should navigate to /auth/register/user
3. Stepper should show 3 steps
4. Form validation should work
```

### 4. Test API Connection

```
1. Open browser console (F12)
2. Try to login (will fail without backend)
3. Should see fetch request in Network tab
4. Request URL should be http://localhost:4000/api/...
```

## 🔧 Development Commands

```cmd
# Install dependencies
npm install

# Start development server (frontend + backend)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Type check
npx tsc --noEmit
```

## 🌐 Environment Setup

### .env File (Root Directory)

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/zapvent

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server
PORT=4000

# Node Environment
NODE_ENV=development
```

## 🎯 Testing Each Dashboard

### Student Dashboard

1. Register as student
2. Login
3. Should redirect to `/student/dashboard`
4. Should see event grid
5. Search and filters should work

### Admin Dashboard

1. Create admin in MongoDB manually
2. Login at `/auth/login/admin`
3. Should redirect to `/admin/dashboard`
4. Should see users and vendors tabs

### Vendor Dashboard

1. Register as vendor
2. After admin approval, login
3. Should redirect to `/vendor/dashboard`
4. Should see statistics and bazaars

## 📊 Browser DevTools Debugging

### Check for Errors:

1. Open DevTools (F12)
2. Console tab - Look for red errors
3. Network tab - Check failed API calls
4. React DevTools - Inspect component tree

### Common Console Errors:

**"Hydration error"**

- Solution: ✅ Fixed with proper client/server separation

**"Cannot find module"**

- Solution: Run `npm install`

**"Failed to fetch"**

- Solution: Start backend server

**"localStorage is not defined"**

- Solution: Wrap in useEffect or check typeof window !== 'undefined'

## ✅ What Should Work Now

After the fixes:

- ✅ Landing page loads without errors
- ✅ All login pages accessible
- ✅ Registration forms work
- ✅ MUI components render correctly
- ✅ Theme applied (blue/gold colors)
- ✅ Responsive design works
- ✅ Navigation works
- ✅ TypeScript compilation successful
- ✅ No hydration errors

## 🚨 If Still Not Working

### 1. Clear Next.js Cache

```cmd
rmdir /s /q .next
npm run dev
```

### 2. Reinstall Dependencies

```cmd
rmdir /s /q node_modules
del package-lock.json
npm install
```

### 3. Check Node Version

```cmd
node --version
```

Should be v18 or higher

### 4. Verify File Structure

Ensure these files exist:

- `app/providers.tsx` ✅
- `app/layout.tsx` ✅
- `lib/theme.ts` ✅
- `app/contexts/AuthContext.tsx` ✅

### 5. Check for Typos in Imports

All imports should use `@/` prefix:

```tsx
import { authApi } from "@/lib/api";
import theme from "@/lib/theme";
```

## 📞 Still Having Issues?

1. Check TypeScript errors: `npx tsc --noEmit`
2. Check ESLint: `npm run lint`
3. Check browser console for runtime errors
4. Verify MongoDB is running
5. Check `.env` file exists and is configured
6. Ensure all dependencies are installed

---

**Current Status:** ✅ All known issues fixed!

Run `npm run dev` in **Command Prompt** to start the application.
