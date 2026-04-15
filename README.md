<<<<<<< HEAD
# Johnrick Auto Supply - Backend API

This is the backend API server for Johnrick Auto Supply e-commerce system built with Node.js, Express, and SQLite.

## 🚀 New Features Added (v2.0.0)

### ✅ Two New APIs:
1. **Reviews API** - Customer product reviews and ratings
2. **Inquiries API** - Contact form and customer support inquiries

## 📋 API Endpoints

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Add new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Add category

### Manufacturers
- `GET /api/manufacturers` - Get all manufacturers
- `GET /api/manufacturers/:id/products` - Get products by manufacturer
- `POST /api/products/:productId/manufacturers` - Assign manufacturer to product
- `DELETE /api/products/:productId/manufacturers/:manufacturerId` - Remove manufacturer from product

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id/status` - Update order status
- `PUT /api/orders/:id/cancel` - Cancel order

### Customers
- `GET /api/customers` - Get all customers
- `GET /api/customers/:id` - Get customer by ID
- `POST /api/customers/signup` - Register new customer
- `POST /api/customers/login` - Customer login
- `PUT /api/customers/:id` - Update customer profile
- `GET /api/customers/:customerId/orders` - Get customer orders

### **🆕 Reviews API**
- `GET /api/reviews` - Get all reviews (admin)
- `GET /api/products/:productId/reviews` - Get reviews for a product
- `GET /api/products/:productId/rating` - Get product rating summary
- `POST /api/reviews` - Add a review
- `DELETE /api/reviews/:id` - Delete a review (admin)

### **🆕 Inquiries API**
- `GET /api/inquiries` - Get all inquiries (admin)
- `GET /api/inquiries/:id` - Get single inquiry
- `POST /api/inquiries` - Submit new inquiry
- `PUT /api/inquiries/:id` - Update inquiry status/response
- `DELETE /api/inquiries/:id` - Delete inquiry

### Authentication
- `POST /api/login` - Admin login

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Local Development

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables (optional):**
Create a `.env` file for email configuration:
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

3. **Start the server:**
```bash
npm start
```

The server will run on `http://localhost:3000`

### Database
- Uses SQLite (file: `johnrick_auto.db`)
- Auto-creates tables on first run
- Default admin credentials: `username: admin`, `password: admin`

## 🌐 Deployment to Railway

### Option 1: Using Railway CLI

1. **Install Railway CLI:**
```bash
npm i -g @railway/cli
```

2. **Login to Railway:**
```bash
railway login
```

3. **Initialize project:**
```bash
railway init
```

4. **Deploy:**
```bash
railway up
```

### Option 2: GitHub Integration

1. Push your code to GitHub
2. Go to [Railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will auto-detect and deploy

### Environment Variables on Railway

Set these in Railway dashboard if using email features:
- `EMAIL_USER` - Your Gmail address
- `EMAIL_PASS` - Gmail app password
- `PORT` - Automatically set by Railway

## 📊 Database Schema

### New Tables:

**reviews**
```sql
id, product_id, customer_id, customer_name, rating (1-5), 
comment, created_at
```

**inquiries**
```sql
id, name, email, phone, subject, message, status, 
admin_response, created_at, responded_at
```

## 🔒 Security Notes

- Change default admin password in production
- Use environment variables for sensitive data
- Enable CORS only for your frontend domain in production

## 📝 Testing

Test API endpoints using tools like:
- Postman
- Insomnia
- cURL
- Thunder Client (VS Code extension)

Example cURL test:
```bash
curl http://localhost:3000/api/products
```

## 🆘 Troubleshooting

**Database locked error:**
- Restart the server
- Make sure no other process is using the database file

**Port already in use:**
- Change PORT in environment variables
- Or kill the process using port 3000

## 📞 Support

For issues or questions, contact the development team.

---
**Version:** 2.0.0  
**Last Updated:** April 2026
=======
"# johnrick-auto-backend" 
>>>>>>> fa875803e617c870a2d489aa74a10895afce6ea2
