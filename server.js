const express = require('express');
const Database = require('better-sqlite3');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// Try to load nodemailer, but don't fail if it's not installed
let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  console.log('⚠️ nodemailer not installed. Email features disabled.');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Database Connection (better-sqlite3 is synchronous)
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

// Helper: Email sending function
async function sendOrderConfirmationEmail(orderDetails) {
  if (!mailTransporter) return { success: false, message: 'Email not configured' };

  const { orderId, customer_name, email, address, payment_method, items, total, order_date } = orderDetails;
  let itemsList = items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₱${item.price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₱${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
  `).join('');

  const mailOptions = {
    from: `"Johnrick Auto Supply" <${EMAIL_CONFIG.auth.user}>`,
    to: email,
    subject: `Order Confirmation #${orderId}`,
    html: `<h1>Order Confirmation #${orderId}</h1><p>Dear ${customer_name}, thank you for your purchase!</p><table>${itemsList}</table><p>Total: ₱${total.toFixed(2)}</p>`
  };

  try {
    await mailTransporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('❌ Email error:', error);
    return { success: false };
  }
}

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(bodyParser.json());

// Database Initialization
function initDatabase() {
  try {
    db.prepare(`CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, price REAL NOT NULL, stock INTEGER NOT NULL, image TEXT, category_id INTEGER, FOREIGN KEY (category_id) REFERENCES categories(id))`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, customer_name TEXT NOT NULL, customer_email TEXT NOT NULL, customer_address TEXT NOT NULL, payment_method TEXT NOT NULL, total_amount REAL NOT NULL, status TEXT DEFAULT 'Pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, received_at TEXT)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, product_id INTEGER, product_name TEXT, price REAL, quantity INTEGER, FOREIGN KEY (order_id) REFERENCES orders(id))`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'admin')`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS manufacturers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, logo TEXT)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS product_manufacturers (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, manufacturer_id INTEGER, FOREIGN KEY (product_id) REFERENCES products(id), FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id))`).run();
    
    // Seed Admin
    db.prepare(`INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', 'admin', 'admin')`).run();
    console.log('✅ Database Tables Ready');
  } catch (err) {
    console.error('❌ Init DB Error:', err);
  }
}
initDatabase();

function seedCategories() {
  try {
    const insert = db.prepare("INSERT OR IGNORE INTO categories (name) VALUES (?)");
    const categoryList = ['Accessories', 'Tires', 'Engine Parts', 'Interior', 'Exterior'];
    
    categoryList.forEach(cat => {
      insert.run(cat);
    });
    
    console.log('✅ Categories check/seeding complete');
  } catch (err) {
    console.error('❌ Seeding error:', err);
  }
}

seedCategories();

// ========== API ROUTES ==========

app.get('/api/health', (req, res) => res.json({ status: 'healthy' }));

// Products & Categories
app.get('/api/categories', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM categories ORDER BY name').all();
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/products', (req, res) => {
  try {
    const products = db.prepare("SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id").all();
    res.json(products);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', (req, res) => {
  const { name, price, stock, image, category_id } = req.body;
  try {
    const info = db.prepare('INSERT INTO products (name, price, stock, image, category_id) VALUES (?, ?, ?, ?, ?)').run(name, price, stock, image, category_id);
    res.json({ id: info.lastInsertRowid });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Orders
app.post('/api/orders', (req, res) => {
  const { customer_id, customer_name, customer_email, customer_address, payment_method, items, total_amount } = req.body;
  try {
    const insertOrder = db.prepare(`INSERT INTO orders (customer_id, customer_name, customer_email, customer_address, payment_method, total_amount) VALUES (?, ?, ?, ?, ?, ?)`);
    const orderInfo = insertOrder.run(customer_id || null, customer_name, customer_email, customer_address, payment_method, total_amount);
    const orderId = orderInfo.lastInsertRowid;

    const insertItem = db.prepare(`INSERT INTO order_items (order_id, product_id, product_name, price, quantity) VALUES (?, ?, ?, ?, ?)`);
    const updateStock = db.prepare(`UPDATE products SET stock = stock - ? WHERE id = ?`);

    for (const item of items) {
      insertItem.run(orderId, item.id || null, item.name, item.price, item.quantity || 1);
      updateStock.run(item.quantity || 1, item.id);
    }

    // Trigger async email
    sendOrderConfirmationEmail({ orderId, customer_name, email: customer_email, address: customer_address, payment_method, items, total: total_amount, order_date: new Date() });

    res.status(201).json({ success: true, orderId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/orders', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT o.*, GROUP_CONCAT(oi.product_name || ' (x' || oi.quantity || ')') as items_summary
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id ORDER BY o.id DESC
    `).all();
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
    if (user) res.json({ success: true, user });
    else res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Static File Routing
app.get('/', (req, res) => res.json({ message: 'Johnrick Auto Supply API Running' }));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Manufacturers API
app.get('/manufacturers', (req, res) => {
  try {
    const manufacturers = db.prepare("SELECT * FROM manufacturers ORDER BY name").all();
    res.json(manufacturers);
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// Seed some default manufacturers if the table is empty
function seedManufacturers() {
  const count = db.prepare("SELECT COUNT(*) as count FROM manufacturers").get().count;
  if (count === 0) {
    const insertM = db.prepare("INSERT INTO manufacturers (name, logo) VALUES (?, ?)");
    const insertPM = db.prepare("INSERT INTO product_manufacturers (product_id, manufacturer_id) VALUES (?, ?)");

    // 1. Insert Manufacturers
    const toyota = insertM.run('Toyota', 'https://logo.clearbit.com/toyota.com').lastInsertRowid;
    const honda = insertM.run('Honda', 'https://logo.clearbit.com/honda.com').lastInsertRowid;
    const bmw = insertM.run('BMW', 'https://logo.clearbit.com/bmw.com').lastInsertRowid;

    // 2. Link existing sample products (assuming IDs 1, 2, 3 exist)
    // Example: Link product 1 to BMW, product 2 to Toyota
    insertPM.run(1, bmw); 
    insertPM.run(2, toyota);
    
    console.log('✅ Manufacturers and links seeded');
  }
}
seedManufacturers();

// Get products by manufacturer ID
app.get('/manufacturers/:id/products', (req, res) => {
  const manufacturerId = req.params.id;
  try {
    const products = db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      JOIN product_manufacturers pm ON p.id = pm.product_id 
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE pm.manufacturer_id = ?
    `).all(manufacturerId);
    
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Categories API
app.get('/api/categories', (req, res) => {
  try {
    const categories = db.prepare("SELECT * FROM categories ORDER BY name").all();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customers API (Fetches unique customers from orders)
app.get('/api/customers', (req, res) => {
  try {
    const customers = db.prepare(`
      SELECT DISTINCT customer_name, customer_email, customer_address 
      FROM orders 
      ORDER BY customer_name ASC
    `).all();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});