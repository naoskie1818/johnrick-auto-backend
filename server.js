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
    db.prepare(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE, phone TEXT, address TEXT, password TEXT NOT NULL, role TEXT DEFAULT 'customer')`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS manufacturers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, logo TEXT)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, customer_name TEXT, rating INTEGER, comment TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`).run();
    
    db.prepare(`INSERT OR IGNORE INTO users (name, email, password, role) VALUES ('admin', 'admin@johnrick.com', 'admin', 'admin')`).run();
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
    ['Audi', 'BMW', 'Chevrolet', 'Ford', 'Honda', 'Hyundai', 'Isuzu', 'Kia', 'Mazda', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'Suzuki', 'Toyota', 'Volkswagen'].forEach(brand => insert.run(brand));
    console.log('✅ Manufacturers check/seeding complete');
  } catch (err) { console.error('❌ Manufacturers Seeding error:', err); }
}

function seedReviews() {
  const count = db.prepare("SELECT COUNT(*) as count FROM reviews").get();
  if (count.count === 0) {
    const insert = db.prepare("INSERT INTO reviews (customer_name, rating, comment) VALUES (?, ?, ?)");
    insert.run('Test User', 5, 'Great service!');
    console.log('✅ Review seeded for testing');
  }
}

initDatabase();
seedCategories();
seedManufacturers();

// ==========================================
// CONTROLLERS
// ==========================================

const getCategories = (req, res) => {
  const rows = db.prepare('SELECT * FROM categories ORDER BY name').all();
  res.json(rows);
};

const getManufacturers = (req, res) => {
  const rows = db.prepare('SELECT * FROM manufacturers ORDER BY name').all();
  res.json(rows);
};

const getOrders = (req, res) => {
  const rows = db.prepare(`
    SELECT o.*, GROUP_CONCAT(oi.product_name || ' (x' || oi.quantity || ')') as items_summary
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    GROUP BY o.id ORDER BY o.id DESC
  `).all();
  res.json(rows);
};

const getCustomers = (req, res) => {
  const customers = db.prepare(`SELECT DISTINCT customer_name, customer_email, customer_address FROM orders ORDER BY customer_name ASC`).all();
  res.json(customers);
};

const getReviews = (req, res) => {
  try {
    const reviews = db.prepare(`SELECT * FROM reviews ORDER BY created_at DESC`).all();
    res.json(reviews || []); // Ensure it returns at least an empty list
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
};

// ==========================================
// ROUTES
// ==========================================

// Health & Index
app.get('/', (req, res) => res.json({ message: 'Johnrick Auto Supply API Running' }));
app.get('/api/health', (req, res) => res.json({ status: 'healthy' }));

// Categories
app.get('/api/categories', getCategories);
app.get('/categories', getCategories);

// Manufacturers
app.get('/api/manufacturers', getManufacturers);
app.get('/manufacturers', getManufacturers);

// Orders
app.get('/api/orders', getOrders);
app.get('/orders', getOrders);

// Customers
app.get('/api/customers', getCustomers);
app.get('/customers', getCustomers);

// Reviews
app.get('/api/reviews', getReviews);
app.get('/reviews', getReviews);

// Products
app.get('/api/products', (req, res) => {
  const products = db.prepare("SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id").all();
  res.json(products);
});

// FIXED: Added product update (PUT) route
app.put('/api/products/:id', (req, res) => {
  const { name, price, stock, image, category_id } = req.body;
  const { id } = req.params;
  try {
    const info = db.prepare('UPDATE products SET name = ?, price = ?, stock = ?, image = ?, category_id = ? WHERE id = ?')
                  .run(name, price, stock, image, category_id, id);
    if (info.changes > 0) res.json({ success: true, message: 'Product updated' });
    else res.status(404).json({ success: false, message: 'Product not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// FIXED: Added product delete route
app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    try {
        db.prepare('DELETE FROM products WHERE id = ?').run(id);
        res.json({ success: true, message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Create a new product
app.post('/api/products', (req, res) => {
  const { name, price, stock, image, category_id } = req.body;
  try {
    const info = db.prepare('INSERT INTO products (name, price, stock, image, category_id) VALUES (?, ?, ?, ?, ?)')
                   .run(name, price, stock, image, category_id);
    res.json({ success: true, id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: User Login
    app.post('/api/customers/login', (req, res) => {
    const { name, password } = req.body; // Changed username to name
    try {
        const user = db.prepare('SELECT * FROM users WHERE name = ? AND password = ?').get(name, password);
        
        if (user) {
            res.json({ 
                success: true, 
                user: { id: user.id, name: user.name, email: user.email } 
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid name or password' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

    // POST: User Signup
    app.post('/api/customers/signup', (req, res) => {
    const { name, email, phone, address, password } = req.body;
    try {
        const info = db.prepare('INSERT INTO users (name, email, phone, address, password) VALUES (?, ?, ?, ?, ?)')
                       .run(name, email, phone, address, password);
        res.json({ success: true, id: info.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
