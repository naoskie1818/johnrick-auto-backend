const express = require('express');
const Database = require('better-sqlite3');
const bodyParser = require('body-parser');
const cors = require('cors');

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
        db.prepare("CREATE TABLE IF NOT EXISTS manufacturers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, logo TEXT)").run();
        db.prepare("CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, customer_name TEXT, rating INTEGER, comment TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)").run();
        
        db.prepare("INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', 'admin', 'admin')").run();
        console.log('✅ Database Tables Ready');
    } catch (err) { console.error('❌ Init DB Error:', err); }
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

// --- Helper for Dual Routing ---
const handleGetProducts = (req, res) => res.json(db.prepare("SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id").all());
const handleGetOrders = (req, res) => res.json(db.prepare("SELECT o.*, GROUP_CONCAT(oi.product_name || ' (x' || oi.quantity || ')') as items_summary FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id GROUP BY o.id ORDER BY o.created_at DESC").all());

// --- API Routes ---
app.get('/', (req, res) => res.json({ message: 'Johnrick Auto Supply API Running' }));

// Products (Supports both /api/products and /products)
app.get(['/api/products', '/products'], handleGetProducts);
app.post(['/api/products', '/products'], (req, res) => {
    const { name, price, stock, image, category_id } = req.body;
    const info = db.prepare("INSERT INTO products (name, price, stock, image, category_id) VALUES (?, ?, ?, ?, ?)").run(name, price, stock, image, category_id);
    res.json({ id: info.lastInsertRowid });
});
app.put(['/api/products/:id', '/products/:id'], (req, res) => {
    const { name, price, stock, image, category_id } = req.body;
    const info = db.prepare("UPDATE products SET name = ?, price = ?, stock = ?, image = ?, category_id = ? WHERE id = ?").run(name, price, stock, image, category_id, req.params.id);
    res.json({ success: info.changes > 0 });
});
app.delete(['/api/products/:id', '/products/:id'], (req, res) => {
    db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
    res.json({ success: true });
});

// Categories & Manufacturers
app.get(['/api/categories', '/categories'], (req, res) => res.json(db.prepare("SELECT * FROM categories ORDER BY name").all()));
app.get(['/api/manufacturers', '/manufacturers'], (req, res) => res.json(db.prepare("SELECT * FROM manufacturers ORDER BY name").all()));

// Orders (Supports both /api/orders and /orders)
app.get(['/api/orders', '/orders'], handleGetOrders);
app.post(['/api/orders', '/orders'], (req, res) => {
    const { customer_name, customer_email, customer_address, payment_method, items, total_amount } = req.body;
    const orderInfo = db.prepare("INSERT INTO orders (customer_name, customer_email, customer_address, payment_method, total_amount) VALUES (?, ?, ?, ?, ?)").run(customer_name, customer_email, customer_address, payment_method, total_amount);
    const orderId = orderInfo.lastInsertRowid;
    const insertItem = db.prepare("INSERT INTO order_items (order_id, product_id, product_name, price, quantity) VALUES (?, ?, ?, ?, ?)");
    items.forEach(item => insertItem.run(orderId, item.id || null, item.name, item.price, item.quantity || 1));
    res.status(201).json({ success: true, orderId });
});

// Auth & Customers (Fixes /api/customers/login 404)
const handleLogin = (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
    user ? res.json({ success: true, user }) : res.status(401).json({ success: false });
};
app.post(['/api/login', '/api/customers/login'], handleLogin);
app.get(['/api/customers', '/customers'], (req, res) => res.json(db.prepare('SELECT DISTINCT customer_name, customer_email FROM orders').all()));

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));