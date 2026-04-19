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

// Email configuration
const EMAIL_CONFIG = {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
};

let mailTransporter = null;
if (nodemailer && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  try {
    mailTransporter = nodemailer.createTransport({
      service: EMAIL_CONFIG.service,
      auth: EMAIL_CONFIG.auth
    });
    console.log('✅ Email service configured');
  } catch (error) {
    console.error('❌ Email config error:', error);
  }
}

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
    db.prepare(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, full_name TEXT, email TEXT UNIQUE NOT NULL, phone TEXT, address TEXT, password TEXT NOT NULL, role TEXT DEFAULT 'customer')`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS manufacturers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, logo TEXT)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, customer_name TEXT, rating INTEGER, comment TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`).run();
    
    // Seed Admin
    db.prepare(`INSERT OR IGNORE INTO users (email, password, role) VALUES ('admin', 'admin', 'admin')`).run();
    console.log('✅ Database Tables Ready');
  } catch (err) {
    console.error('❌ Init DB Error:', err);
  }
}

function seedCategories() {
  try {
    const insert = db.prepare("INSERT OR IGNORE INTO categories (name) VALUES (?)");
    ['Accessories', 'Tires', 'Engine Parts', 'Interior', 'Exterior'].forEach(cat => insert.run(cat));
    console.log('✅ Categories check/seeding complete');
  } catch (err) { console.error('❌ Seeding error:', err); }
}

function seedManufacturers() {
  try {
    const insert = db.prepare("INSERT OR IGNORE INTO manufacturers (name) VALUES (?)");
    const brands = ['Audi', 'BMW', 'Chevrolet', 'Ford', 'Honda', 'Hyundai', 'Isuzu', 'Kia', 'Mazda', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'Suzuki', 'Toyota', 'Volkswagen'];
    brands.forEach(brand => insert.run(brand));
    console.log('✅ Manufacturers check/seeding complete');
  } catch (err) { console.error('❌ Manufacturers Seeding error:', err); }
}

initDatabase();
seedCategories();
seedManufacturers();

// ==========================================
// API ROUTES
// ==========================================

// Dashboard: Top Selling Products
app.get(['/api/orders/top-products', '/orders/top-products'], (req, res) => {
  try {
    const rows = db.prepare(`SELECT product_name as name, SUM(quantity) as total_sold FROM order_items GROUP BY product_id ORDER BY total_sold DESC LIMIT 5`).all();
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Customer Signup
app.post(['/api/customers/signup', '/customers/signup'], (req, res) => {
  const { name, email, phone, address, password } = req.body;
  try {
    const info = db.prepare(`INSERT INTO users (full_name, email, phone, address, password, role) VALUES (?, ?, ?, ?, ?, 'customer')`).run(name, email, phone, address, password);
    res.status(201).json({ success: true, userId: info.lastInsertRowid });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// Categories & Manufacturers
const getCategories = (req, res) => res.json(db.prepare('SELECT * FROM categories ORDER BY name').all());
const getManufacturers = (req, res) => res.json(db.prepare('SELECT * FROM manufacturers ORDER BY name').all());
app.get(['/api/categories', '/categories'], getCategories);
app.get(['/api/manufacturers', '/manufacturers'], getManufacturers);

// Orders & Customers
app.get(['/api/orders', '/orders'], (req, res) => {
  const rows = db.prepare(`SELECT o.*, GROUP_CONCAT(oi.product_name || ' (x' || oi.quantity || ')') as items_summary FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id GROUP BY o.id ORDER BY o.id DESC`).all();
  res.json(rows);
});

app.get(['/api/customers', '/customers'], (req, res) => {
  const customers = db.prepare(`SELECT DISTINCT customer_name, customer_email, customer_address FROM orders ORDER BY customer_name ASC`).all();
  res.json(customers);
});

// Reviews
app.get(['/api/reviews', '/reviews'], (req, res) => {
  res.json(db.prepare(`SELECT * FROM reviews ORDER BY created_at DESC`).all());
});

// Products
app.get('/api/products', (req, res) => {
  const products = db.prepare("SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id").all();
  res.json(products);
});

app.post('/api/products', (req, res) => {
  const { name, price, stock, image, category_id } = req.body;
  const info = db.prepare('INSERT INTO products (name, price, stock, image, category_id) VALUES (?, ?, ?, ?, ?)').run(name, price, stock, image, category_id);
  res.json({ id: info.lastInsertRowid });
});

// Admin Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE (email = ? OR username = ?) AND password = ?').get(username, username, password);
  if (user) res.json({ success: true, user });
  else res.status(401).json({ success: false, message: 'Invalid credentials' });
});

app.get('/', (req, res) => res.json({ message: 'Johnrick Auto Supply API Running' }));

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));