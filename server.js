const express = require('express');
const Database = require('better-sqlite3');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  console.log('⚠️ nodemailer not installed.');
}

const app = express();
const PORT = process.env.PORT || 8080;

const db = new Database('./johnrick_auto.db');
console.log('✅ Connected to SQLite database');

app.use(cors({ origin: '*', credentials: true }));
app.use(bodyParser.json());

// --- Database Initialization ---
function initDatabase() {
  try {
    db.prepare("CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)").run();
    db.prepare("CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, price REAL NOT NULL, stock INTEGER NOT NULL, image TEXT, category_id INTEGER, FOREIGN KEY (category_id) REFERENCES categories(id))").run();
    db.prepare("CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_name TEXT NOT NULL, customer_email TEXT NOT NULL, customer_address TEXT NOT NULL, payment_method TEXT NOT NULL, total_amount REAL NOT NULL, status TEXT DEFAULT 'Pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)").run();
    db.prepare("CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, product_id INTEGER, product_name TEXT, price REAL, quantity INTEGER, FOREIGN KEY (order_id) REFERENCES orders(id))").run();
    db.prepare("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'admin')").run();
    db.prepare("INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', 'admin', 'admin')").run();
    console.log('✅ Database Ready');
  } catch (err) { console.error('❌ Init DB Error:', err); }
}
initDatabase();

// --- API Routes ---

app.get('/', (req, res) => res.json({ message: 'API Running' }));

// Products
app.get('/api/products', (req, res) => {
  const products = db.prepare("SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id").all();
  res.json(products);
});

app.put('/api/products/:id', (req, res) => {
  const { name, price, stock, image, category_id } = req.body;
  const { id } = req.params;
  const info = db.prepare("UPDATE products SET name = ?, price = ?, stock = ?, image = ?, category_id = ? WHERE id = ?").run(name, price, stock, image, category_id, id);
  res.json({ success: info.changes > 0 });
});

// Orders (THE FIX FOR YOUR SCREENSHOT)
app.get('/api/orders', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT o.*, GROUP_CONCAT(oi.product_name || ' (x' || oi.quantity || ')') as items_summary 
      FROM orders o 
      LEFT JOIN order_items oi ON o.id = oi.order_id 
      GROUP BY o.id 
      ORDER BY o.created_at DESC
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', (req, res) => {
  const { customer_name, customer_email, customer_address, payment_method, items, total_amount } = req.body;
  const orderInfo = db.prepare("INSERT INTO orders (customer_name, customer_email, customer_address, payment_method, total_amount) VALUES (?, ?, ?, ?, ?)").run(customer_name, customer_email, customer_address, payment_method, total_amount);
  const orderId = orderInfo.lastInsertRowid;
  const insertItem = db.prepare("INSERT INTO order_items (order_id, product_id, product_name, price, quantity) VALUES (?, ?, ?, ?, ?)");
  items.forEach(item => insertItem.run(orderId, item.id || null, item.name, item.price, item.quantity || 1));
  res.status(201).json({ success: true, orderId });
});

// Categories & Customers
app.get('/api/categories', (req, res) => res.json(db.prepare('SELECT * FROM categories').all()));
app.get('/api/customers', (req, res) => res.json(db.prepare('SELECT DISTINCT customer_name, customer_email FROM orders').all()));

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
  if (user) res.json({ success: true, user });
  else res.status(401).json({ success: false });
});

app.listen(PORT, () => console.log(`🚀 Port ${PORT}`));