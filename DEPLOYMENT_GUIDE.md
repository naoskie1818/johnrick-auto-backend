# 🚀 Johnrick Auto Supply - Complete Setup & Deployment Guide

## 📦 What's Included

This project includes:

### Backend (Node.js + Express + SQLite)
- 5 Core APIs: Products, Categories, Orders, Customers, Manufacturers
- **2 NEW APIs**: Reviews & Inquiries
- Email notifications (optional)
- Auto-creates database on first run

### Frontend (HTML + Bootstrap + jQuery)
- Landing page with **image carousel**
- **Unified login** (customer + admin in one modal)
- Admin dashboard with **logout button**
- **2 NEW tabs**: Reviews & Inquiries management
- **Contact Us page** for customer inquiries
- Fully responsive design

---

## 🎯 Quick Start (Local Development)

### 1. Backend Setup

```bash
# Navigate to backend folder
cd johnrick-backend

# Install dependencies
npm install

# Start server
npm start
```

Server will run on: `http://localhost:3000`

### 2. Frontend Setup

```bash
# Navigate to frontend folder
cd johnrick-frontend

# No installation needed! Just open in browser:
# Option 1: Double-click index.html
# Option 2: Use Live Server extension in VS Code
# Option 3: Use Python simple server:
python -m http.server 8000
```

Frontend will be at: `http://localhost:8000`

### 3. Update Frontend API URL

Edit `johnrick-frontend/js.js` line 1:

```javascript
const API_URL = 'http://localhost:3000/api';
```

### 4. Test Everything

1. Open frontend in browser
2. Click "Login" → Select "Admin" tab
3. Login with: `admin` / `admin`
4. Explore all tabs in admin dashboard
5. Test contact form at `contact.html`

---

## 🌐 Production Deployment

### Backend → Railway

1. **Push backend to GitHub:**
```bash
cd johnrick-backend
git init
git add .
git commit -m "Initial backend commit"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

2. **Deploy to Railway:**
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your backend repository
   - Railway auto-detects Node.js and deploys
   - Copy your deployment URL (e.g., `https://your-app.up.railway.app`)

3. **Set Environment Variables (Optional):**
   - In Railway dashboard → Variables tab:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

### Frontend → Vercel

1. **Update API URL in js.js:**
```javascript
const API_URL = 'https://your-app.up.railway.app/api';
```

2. **Push frontend to GitHub:**
```bash
cd johnrick-frontend
git init
git add .
git commit -m "Initial frontend commit"
git remote add origin YOUR_FRONTEND_GITHUB_REPO_URL
git push -u origin main
```

3. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your frontend repository
   - Click "Deploy"
   - Your site will be live at: `https://your-site.vercel.app`

---

## ✨ New Features Guide

### 1. Image Carousel (Landing Page)

**Location:** `index.html`

**How to customize:**
```html
<!-- Edit carousel items (lines 58-103) -->
<div class="carousel-item active">
  <img src="YOUR_IMAGE_URL" alt="Description">
  <div class="carousel-caption">
    <h2>Your Heading</h2>
    <p>Your subtitle</p>
  </div>
</div>
```

**Add more slides:**
1. Duplicate a `carousel-item` div
2. Remove `active` class
3. Add indicator button in carousel-indicators section

### 2. Unified Login System

**How it works:**
- Click "Login" button in navbar
- Toggle between "Customer" and "Admin"
- Admin login redirects to admin dashboard
- Customer login stays on current page

**Testing:**
- **Customer:** Create account via "Sign Up"
- **Admin:** Username: `admin`, Password: `admin`

### 3. Admin Dashboard - Reviews Tab

**Features:**
- View all customer reviews
- See product ratings (1-5 stars)
- Delete inappropriate reviews
- Monitor customer feedback

**How to use:**
1. Login as admin
2. Click "Reviews" tab
3. Click "Refresh" to load reviews
4. Delete any review with trash icon

### 4. Admin Dashboard - Inquiries Tab

**Features:**
- View customer messages from contact form
- Respond to inquiries
- Update status (Pending/Responded/Resolved)
- Delete spam or resolved inquiries

**How to use:**
1. Login as admin
2. Click "Inquiries" tab
3. Click "Respond" to send reply
4. Mark as "Resolved" when done

### 5. Contact Us Page

**Features:**
- Professional contact form
- Subject dropdown (Product Inquiry, Order Status, etc.)
- Contact information display
- FAQ section

**Access:** 
- Click "Contact Us" in footer
- Direct URL: `yoursite.com/contact.html`

**Customization:**
Edit `contact.html` to update:
- Phone number
- Email address
- Business hours
- FAQ items

### 6. Admin Logout Button

**Location:** Admin navbar (top right)

**Functionality:**
- Clears admin session
- Redirects to homepage
- Confirmation prompt before logout

---

## 🔧 Configuration & Settings

### Change Admin Password

**Backend:** Edit `server.js` (line ~404):

```javascript
db.run(`INSERT OR IGNORE INTO users (username, password, role) 
        VALUES ('admin', 'YOUR_NEW_PASSWORD', 'admin')`);
```

Then delete `johnrick_auto.db` and restart server.

### Update Contact Information

**Multiple files to edit:**

1. `index.html` - Top bar, footer
2. `contact.html` - Contact info section
3. All HTML files - Footer section

Search for: `0917-703-0700` and `johnrickautosupply@gmail.com`

### Customize Colors

**Primary Red:** `#d60000` or `#dc3545`

**Files to edit:**
- `css.css`
- Inline styles in HTML files
- Bootstrap `btn-danger` class

---

## 📊 API Testing

### Test Reviews API

```bash
# Get all reviews
curl https://your-backend.up.railway.app/api/reviews

# Get product reviews
curl https://your-backend.up.railway.app/api/products/1/reviews

# Add a review
curl -X POST https://your-backend.up.railway.app/api/reviews \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "customer_name": "John Doe",
    "rating": 5,
    "comment": "Great product!"
  }'
```

### Test Inquiries API

```bash
# Get all inquiries
curl https://your-backend.up.railway.app/api/inquiries

# Submit inquiry
curl -X POST https://your-backend.up.railway.app/api/inquiries \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "subject": "Product Inquiry",
    "message": "Do you have brake pads for Honda Civic?"
  }'
```

---

## 🐛 Troubleshooting

### Backend Issues

**Problem:** Server won't start
```bash
# Solution: Check if port 3000 is in use
netstat -ano | findstr :3000  # Windows
lsof -ti:3000                 # Mac/Linux

# Kill the process or change port
```

**Problem:** Database errors
```bash
# Solution: Delete database and restart
rm johnrick_auto.db
npm start
```

### Frontend Issues

**Problem:** Can't connect to backend
- Check `API_URL` in `js.js`
- Verify backend is running
- Check browser console for CORS errors

**Problem:** Login not working
- Clear browser cache and cookies
- Check Network tab in DevTools
- Verify backend `/api/login` endpoint works

**Problem:** Carousel not showing
- Check image URLs are valid
- Verify Bootstrap JS is loaded
- Check browser console for errors

---

## 📋 Feature Checklist

### ✅ Completed Features

- [x] 5 Core APIs (Products, Orders, Customers, Categories, Manufacturers)
- [x] **Reviews API** - Product ratings and comments
- [x] **Inquiries API** - Contact form submissions
- [x] **Image Carousel** on landing page
- [x] **Unified login modal** (Customer + Admin)
- [x] **Admin logout button**
- [x] **Reviews management tab** in admin
- [x] **Inquiries management tab** in admin
- [x] **Contact Us page**
- [x] Removed admin link from footer
- [x] Mobile responsive design

### 📝 Suggested Future Enhancements

- [ ] Product search functionality
- [ ] Shopping cart persistence
- [ ] Order tracking system
- [ ] Email notifications for inquiries
- [ ] Product image upload
- [ ] Advanced filtering
- [ ] Wishlist feature
- [ ] Payment gateway integration
- [ ] Inventory alerts

---

## 🆘 Getting Help

### Resources

- **Bootstrap Docs:** https://getbootstrap.com/docs/5.3/
- **Express Docs:** https://expressjs.com/
- **Railway Docs:** https://docs.railway.app/
- **Vercel Docs:** https://vercel.com/docs

### Common Commands

```bash
# Backend
npm start          # Start server
npm install        # Install dependencies

# Frontend  
# No commands needed - just open HTML files!

# Git
git status         # Check changes
git add .          # Stage all changes
git commit -m ""   # Commit with message
git push           # Push to remote
```

---

## 📞 Project Info

**Project:** Johnrick Auto Supply E-commerce System  
**Version:** 2.0.0  
**Stack:** Node.js, Express, SQLite, HTML, Bootstrap, jQuery  
**APIs:** 7 Total (5 Core + 2 New)  

**New APIs:**
1. Reviews API - For product ratings
2. Inquiries API - For customer support

**Deployment:**
- Backend: Railway
- Frontend: Vercel

---

## ✨ Summary of Changes

### What's New:
1. ✅ Image carousel on landing page
2. ✅ Unified login (admin + customer in one modal)
3. ✅ Admin logout button
4. ✅ Reviews management (new tab)
5. ✅ Inquiries management (new tab)
6. ✅ Contact Us page
7. ✅ 2 new backend APIs (Reviews + Inquiries)

### What's Removed:
- ❌ Admin link from footer (merged into login modal)

### What's Improved:
- ⚡ Better user experience
- ⚡ Cleaner navigation
- ⚡ More professional admin dashboard
- ⚡ Enhanced customer support system

---

**Good luck with your project! 🚀**
