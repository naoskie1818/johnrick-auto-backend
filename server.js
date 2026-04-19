const express = require('express');
const Database = require('better-sqlite3');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// Try to load nodemailer
let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  console.log('⚠️ nodemailer not installed. Email features disabled.');
}

const app = express();
const PORT = process.env.PORT || 8080;

// Database Connection
const db = new Database('./johnrick_auto.db');
console.log('✅ Connected to SQLite database');

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(bodyParser.json());

// ==========================================
// DATABASE INITIALIZATION & SEEDING
// ==========================================

function initDatabase() {
  try {
    db.prepare(`CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, price REAL NOT NULL, stock INTEGER NOT NULL, image TEXT, category_id INTEGER, FOREIGN KEY (category_id) REFERENCES categories(id))`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, customer_name TEXT NOT NULL, customer_email TEXT NOT NULL, customer_address TEXT NOT NULL, payment_method TEXT NOT NULL, total_amount REAL NOT NULL, status TEXT DEFAULT 'Pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, received_at TEXT)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, product_id INTEGER, product_name TEXT, price REAL, quantity INTEGER, FOREIGN KEY (order_id) REFERENCES orders(id))`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS manufacturers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, logo TEXT)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, customer_name TEXT, rating INTEGER, comment TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`).run();
    
    // Create basic users table first
    db.prepare(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT NOT NULL, role TEXT DEFAULT 'admin')`).run();

    // --- CRITICAL SIGNUP FIX: Add missing columns if they don't exist ---
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const columns = tableInfo.map(c => c.name);
    if (!columns.includes('email')) {
      console.log('🔧 Updating users table for signup...');
      db.prepare("ALTER TABLE users ADD COLUMN full_name TEXT").run();
      db.prepare("ALTER TABLE users ADD COLUMN email TEXT").run();
      db.prepare("ALTER TABLE users ADD COLUMN phone TEXT").run();
      db.prepare("ALTER TABLE users ADD COLUMN address TEXT").run();
    }

    db.prepare(`INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', 'admin', 'admin')`).run();
    console.log('✅ Database Tables Ready');
  } catch (err) {
    console.error('❌ Init DB Error:', err);
  }
}

// ... (Your seed functions stay exactly as you wrote them)
function seedCategories() {
  try {
    const insert = db.prepare("INSERT OR IGNORE INTO categories (name) VALUES (?)");
    ['Accessories', 'Tires', 'Engine Parts', 'Interior', 'Exterior'].forEach(cat => insert.run(cat));
  } catch (err) { console.error('❌ Seeding error:', err); }
}

function seedManufacturers() {
  try {
    const insert = db.prepare("INSERT OR IGNORE INTO manufacturers (name) VALUES (?)");
    ['Audi', 'BMW', 'Chevrolet', 'Ford', 'Honda', 'Hyundai', 'Isuzu', 'Kia', 'Mazda', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'Suzuki', 'Toyota', 'Volkswagen'].forEach(brand => insert.run(brand));
  } catch (err) { console.error('❌ Manufacturers Seeding error:', err); }
}

initDatabase();
seedCategories();
seedManufacturers();

// ==========================================
// ROUTES (Including your fixed Signup & Dashboard)
// ==========================================

// Dashboard: Top Selling Products (Fixes the red error on dashboard)
app.get(['/api/orders/top-products', '/orders/top-products'], (req, res) => {
  const rows = db.prepare(`SELECT product_name as name, SUM(quantity) as total_sold FROM order_items GROUP BY product_id ORDER BY total_sold DESC LIMIT 5`).all();
  res.json(rows);
});

// SIGNUP ROUTE (The missing piece)
app.post(['/api/customers/signup', '/customers/signup'], (req, res) => {
  const { name, email, phone, address, password } = req.body;
  try {
    const info = db.prepare(`INSERT INTO users (full_name, email, phone, address, password, role) VALUES (?, ?, ?, ?, ?, 'customer')`).run(name, email, phone, address, password);
    res.status(201).json({ success: true, userId: info.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// All your original GET routes
app.get('/api/categories', (req, res) => res.json(db.prepare('SELECT * FROM categories ORDER BY name').all()));
app.get('/api/manufacturers', (req, res) => res.json(db.prepare('SELECT * FROM manufacturers ORDER BY name').all()));
app.get('/api/orders', (req, res) => res.json(db.prepare(`SELECT o.*, GROUP_CONCAT(oi.product_name || ' (x' || oi.quantity || ')') as items_summary FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id GROUP BY o.id ORDER BY o.id DESC`).all()));
app.get('/api/customers', (req, res) => res.json(db.prepare(`SELECT DISTINCT customer_name, customer_email, customer_address FROM orders ORDER BY customer_name ASC`).all()));
app.get('/api/reviews', (req, res) => res.json(db.prepare(`SELECT * FROM reviews ORDER BY created_at DESC`).all()));
app.get('/api/products', (req, res) => res.json(db.prepare("SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id").all()));

// Login logic (Updated to check email or username)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE (username = ? OR email = ?) AND password = ?').get(username, username, password);
  if (user) res.json({ success: true, user });
  else res.status(401).json({ success: false, message: 'Invalid credentials' });
});

app.get('/', (req, res) => res.json({ message: 'Johnrick Auto Supply API Running' }));

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));