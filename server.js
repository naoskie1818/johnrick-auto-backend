const express = require('express');
const Database = require('better-sqlite3');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// Database Connection
const db = new Database('./johnrick_auto.db');
console.log('✅ Connected to SQLite database');

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(bodyParser.json());

// ==========================================
// DATABASE INITIALIZATION & MIGRATIONS
// ==========================================

function initDatabase() {
  try {
    // 1. Core Tables
    db.prepare(`CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, price REAL NOT NULL, stock INTEGER NOT NULL, image TEXT, category_id INTEGER)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, customer_name TEXT, customer_email TEXT, customer_address TEXT, payment_method TEXT, total_amount REAL, status TEXT DEFAULT 'Pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, product_id INTEGER, product_name TEXT, price REAL, quantity INTEGER)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS manufacturers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, customer_name TEXT, rating INTEGER, comment TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`).run();
    
    // 2. Initial Users Table
    db.prepare(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT NOT NULL, role TEXT DEFAULT 'customer')`).run();

    // 3. FIXED: COLUMN MIGRATION
    // This checks if the 'email' column exists. If not, it adds it.
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const hasEmail = tableInfo.some(column => column.name === 'email');
    if (!hasEmail) {
      console.log('🔧 Adding missing email column to users table...');
      db.prepare("ALTER TABLE users ADD COLUMN email TEXT UNIQUE").run();
      db.prepare("ALTER TABLE users ADD COLUMN full_name TEXT").run();
      db.prepare("ALTER TABLE users ADD COLUMN phone TEXT").run();
      db.prepare("ALTER TABLE users ADD COLUMN address TEXT").run();
    }

    // Seed Admin
    db.prepare(`INSERT OR IGNORE INTO users (email, username, password, role) VALUES ('admin@johnrick.com', 'admin', 'admin', 'admin')`).run();
    console.log('✅ Database Tables and Columns Ready');
  } catch (err) {
    console.error('❌ Init DB Error:', err);
  }
}

// Seeding logic for Car Manufacturers
function seedData() {
  const brands = ['Audi', 'BMW', 'Chevrolet', 'Ford', 'Honda', 'Hyundai', 'Isuzu', 'Kia', 'Mazda', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'Suzuki', 'Toyota', 'Volkswagen'];
  const insertBrand = db.prepare("INSERT OR IGNORE INTO manufacturers (name) VALUES (?)");
  brands.forEach(brand => insertBrand.run(brand));

  const cats = ['Accessories', 'Tires', 'Engine Parts', 'Interior', 'Exterior'];
  const insertCat = db.prepare("INSERT OR IGNORE INTO categories (name) VALUES (?)");
  cats.forEach(cat => insertCat.run(cat));
  console.log('✅ Seeding complete');
}

initDatabase();
seedData();

// ==========================================
// API ROUTES
// ==========================================

// Dashbaord Stats
app.get(['/api/orders/top-products', '/orders/top-products'], (req, res) => {
  const rows = db.prepare(`SELECT product_name as name, SUM(quantity) as total_sold FROM order_items GROUP BY product_id ORDER BY total_sold DESC LIMIT 5`).all();
  res.json(rows);
});

// Signup
app.post(['/api/customers/signup', '/customers/signup'], (req, res) => {
  const { name, email, phone, address, password } = req.body;
  try {
    const info = db.prepare(`INSERT INTO users (full_name, email, phone, address, password, role) VALUES (?, ?, ?, ?, ?, 'customer')`).run(name, email, phone, address, password);
    res.status(201).json({ success: true, userId: info.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Categories
app.get(['/api/categories', '/categories'], (req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY name').all());
});

// Manufacturers
app.get(['/api/manufacturers', '/manufacturers'], (req, res) => {
  res.json(db.prepare('SELECT * FROM manufacturers ORDER BY name').all());
});

// Orders
app.get(['/api/orders', '/orders'], (req, res) => {
  const rows = db.prepare(`SELECT * FROM orders ORDER BY created_at DESC`).all();
  res.json(rows);
});

// Reviews
app.get(['/api/reviews', '/reviews'], (req, res) => {
  res.json(db.prepare(`SELECT * FROM reviews ORDER BY created_at DESC`).all());
});

// Basic Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE (email = ? OR username = ?) AND password = ?').get(username, username, password);
  if (user) res.json({ success: true, user });
  else res.status(401).json({ success: false, message: 'Invalid credentials' });
});

app.get('/', (req, res) => res.json({ message: 'Server Active' }));

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));