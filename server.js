\const express = require('express');
const Database = require('better-sqlite3');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Database Connection
const db = new Database('./johnrick_auto.db');
console.log('✅ Connected to SQLite database');

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(bodyParser.json());

// ==========================================
// DATABASE TABLES
// ==========================================
function initDatabase() {
    try {
        db.prepare("CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)").run();
        db.prepare("CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, price REAL NOT NULL, stock INTEGER NOT NULL, image TEXT, category_id INTEGER, FOREIGN KEY (category_id) REFERENCES categories(id))").run();
        db.prepare("CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_name TEXT NOT NULL, customer_email TEXT NOT NULL, customer_address TEXT NOT NULL, payment_method TEXT NOT NULL, total_amount REAL NOT NULL, status TEXT DEFAULT 'Pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)").run();
        db.prepare("CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, product_id INTEGER, product_name TEXT, price REAL, quantity INTEGER, FOREIGN KEY (order_id) REFERENCES orders(id))").run();
        db.prepare("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'admin')").run();
        db.prepare("CREATE TABLE IF NOT EXISTS manufacturers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, logo TEXT)").run();
        db.prepare("CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, customer_name TEXT, rating INTEGER, comment TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)").run();
        
        db.prepare("INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', 'admin', 'admin')").run();
        console.log('✅ Database Tables Ready');
    } catch (err) {
        console.error('❌ Init DB Error:', err);
    }
}

function seedData() {
    try {
        const catInsert = db.prepare("INSERT OR IGNORE INTO categories (name) VALUES (?)");
        ['Accessories', 'Tires', 'Engine Parts', 'Interior', 'Exterior'].forEach(cat => catInsert.run(cat));

        const manInsert = db.prepare("INSERT OR IGNORE INTO manufacturers (name) VALUES (?)");
        ['Audi', 'BMW', 'Chevrolet', 'Ford', 'Honda', 'Hyundai', 'Isuzu', 'Kia', 'Mazda', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'Suzuki', 'Toyota', 'Volkswagen'].forEach(brand => manInsert.run(brand));
        console.log('✅ Seeding complete');
    } catch (err) { console.error('❌ Seeding error:', err); }
}

initDatabase();
seedData();

// ==========================================
// DUAL-MAPPED ROUTES (Fixes 404s)
// ==========================================

// Products
const getProducts = (req, res) => {
    const products = db.prepare("SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id").all();
    res.json(products);
};
app.get('/api/products', getProducts);
app.get('/products', getProducts);

app.post('/api/products', (req, res) => {
    const { name, price, stock, image, category_id } = req.body;
    const info = db.prepare("INSERT INTO products (name, price, stock, image, category_id) VALUES (?, ?, ?, ?, ?)").run(name, price, stock, image, category_id);
    res.json({ id: info.lastInsertRowid });
});

const updateProduct = (req, res) => {
    const { name, price, stock, image, category_id } = req.body;
    const { id } = req.params;
    const info = db.prepare("UPDATE products SET name = ?, price = ?, stock = ?, image = ?, category_id = ? WHERE id = ?").run(name, price, stock, image, category_id, id);
    res.json({ success: info.changes > 0 });
};
app.put('/api/products/:id', updateProduct);
app.put('/products/:id', updateProduct);

const deleteProduct = (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM products WHERE id = ?").run(id);
    res.json({ success: true });
};
app.delete('/api/products/:id', deleteProduct);
app.delete('/products/:id', deleteProduct);

// Categories & Manufacturers
const getCategories = (req, res) => res.json(db.prepare("SELECT * FROM categories ORDER BY name").all());
app.get('/api/categories', getCategories);
app.get('/categories', getCategories);

const getManufacturers = (req, res) => res.json(db.prepare("SELECT * FROM manufacturers ORDER BY name").all());
app.get('/api/manufacturers', getManufacturers);
app.get('/manufacturers', getManufacturers);

// Orders
const getOrders = (req, res) => {
    const rows = db.prepare("SELECT o.*, GROUP_CONCAT(oi.product_name || ' (x' || oi.quantity || ')') as items_summary FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id GROUP BY o.id ORDER BY o.created_at DESC").all();
    res.json(rows);
};
app.get('/api/orders', getOrders);
app.get('/orders', getOrders);

app.post('/api/orders', (req, res) => {
    const { customer_name, customer_email, customer_address, payment_method, items, total_amount } = req.body;
    const orderInfo = db.prepare("INSERT INTO orders (customer_name, customer_email, customer_address, payment_method, total_amount) VALUES (?, ?, ?, ?, ?)").run(customer_name, customer_email, customer_address, payment_method, total_amount);
    const orderId = orderInfo.lastInsertRowid;
    const insertItem = db.prepare("INSERT INTO order_items (order_id, product_id, product_name, price, quantity) VALUES (?, ?, ?, ?, ?)");
    items.forEach(item => insertItem.run(orderId, item.id || null, item.name, item.price, item.quantity || 1));
    res.status(201).json({ success: true, orderId });
});

// Reviews & Customers
app.get('/api/reviews', (req, res) => res.json(db.prepare("SELECT * FROM reviews ORDER BY created_at DESC").all()));
app.get('/api/customers', (req, res) => res.json(db.prepare("SELECT DISTINCT customer_name, customer_email FROM orders").all()));

// Login (Dual-mapped for /api/login and /api/customers/login found in logs)
const login = (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
    if (user) res.json({ success: true, user });
    else res.status(401).json({ success: false });
};
app.post('/api/login', login);
app.post('/api/customers/login', login);

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));