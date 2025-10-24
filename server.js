const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// Try to load nodemailer, but don't fail if it's not installed
let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  console.log('⚠️  nodemailer not installed. Email features disabled.');
  console.log('   To enable: npm install nodemailer');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Email configuration (only if nodemailer is available)
const EMAIL_CONFIG = {
  service: 'gmail',
  auth: {
    user: 'johnrickautosupply@gmail.com', // Replace with your email
    pass: 'johnrickautosupply123' // Replace with your app password
  }
};

// Create email transporter
let mailTransporter = null;

if (nodemailer && EMAIL_CONFIG.auth.user !== 'your-email@gmail.com') {
  try {
    mailTransporter = nodemailer.createTransport({
      service: EMAIL_CONFIG.service,
      auth: EMAIL_CONFIG.auth
    });
    console.log('✅ Email service configured');
  } catch (error) {
    console.log('⚠️  Email configuration error:', error.message);
  }
} else if (!nodemailer) {
  console.log('📧 Email features disabled (nodemailer not installed)');
} else {
  console.log('⚠️  Email not configured. Update EMAIL_CONFIG in server.js');
}

// Function to send order confirmation email
async function sendOrderConfirmationEmail(orderDetails) {
  if (!mailTransporter) {
    console.log('📧 Email disabled, skipping send');
    return { success: false, message: 'Email not configured' };
  }

  const { orderId, customer_name, email, address, payment_method, items, total, order_date } = orderDetails;

  // Build items list for email
  let itemsList = '';
  items.forEach(item => {
    itemsList += `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₱${item.price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₱${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `;
  });

  const mailOptions = {
    from: `"Johnrick Auto Supply" <${EMAIL_CONFIG.auth.user}>`,
    to: email,
    subject: `Order Confirmation #${orderId} - Johnrick Auto Supply`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #d60000; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .order-details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
          table { width: 100%; border-collapse: collapse; }
          .total { font-size: 18px; font-weight: bold; text-align: right; padding: 20px; background: #f0f0f0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>JOHNRICK AUTO SUPPLY</h1>
            <p>Thank You for Your Order!</p>
          </div>
          
          <div class="content">
            <h2>Order Confirmation</h2>
            <p>Dear ${customer_name},</p>
            <p>Thank you for your purchase! Your order has been confirmed and is being processed.</p>
            
            <div class="order-details">
              <h3>Order Details</h3>
              <p><strong>Order ID:</strong> #${orderId}</p>
              <p><strong>Order Date:</strong> ${new Date(order_date).toLocaleString()}</p>
              <p><strong>Payment Method:</strong> ${payment_method}</p>
              
              <h3 style="margin-top: 20px;">Delivery Address</h3>
              <p>${address}</p>
              
              <h3 style="margin-top: 20px;">Order Items</h3>
              <table>
                <thead>
                  <tr style="background: #d60000; color: white;">
                    <th style="padding: 10px; text-align: left;">Product</th>
                    <th style="padding: 10px; text-align: center;">Qty</th>
                    <th style="padding: 10px; text-align: right;">Price</th>
                    <th style="padding: 10px; text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsList}
                </tbody>
              </table>
              
              <div class="total">
                Total: ₱${total.toFixed(2)}
              </div>
            </div>
            
            <p><strong>What's Next?</strong></p>
            <ul>
              <li>Your order is being prepared</li>
              <li>We will contact you for delivery arrangements</li>
              <li>For questions, call/text: <strong>0917-703-0700</strong></li>
            </ul>
            
            <p>We appreciate your business!</p>
          </div>
          
          <div class="footer">
            <p>Johnrick Auto Supply<br>
            Phone: 0917-703-0700<br>
            This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await mailTransporter.sendMail(mailOptions);
    console.log('✅ Order confirmation email sent to:', email);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, message: error.message };
  }
}

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://your-frontend-url.vercel.app', // We'll update this later
    /\.vercel\.app$/ // Allow all Vercel preview URLs
  ],
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.static('public')); // Serve your HTML/CSS/JS files
app.use(express.static('.')); // Also serve files from root directory

// Serve HTML pages explicitly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/profile.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'profile.html'));
});

app.get('/cart.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'cart.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Initialize SQLite Database
const db = new sqlite3.Database('./johnrick_auto.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

// Create tables
function initDatabase() {
  db.serialize(() => {
    // Create categories table
    db.run(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )`, (err) => {
      if (err) console.error('Error creating categories table:', err);
      else console.log('Categories table ready');
    });

    // Create products table with category
    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL,
      image TEXT,
      category_id INTEGER,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )`, (err) => {
      if (err) console.error('Error creating products table:', err);
      else console.log('Products table ready');
    });

    // Create orders table
    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      email TEXT NOT NULL,
      address TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      total REAL NOT NULL,
      order_date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) console.error('Error creating orders table:', err);
      else console.log('Orders table ready');
    });

    // Create order_items table
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      product_name TEXT,
      price REAL,
      quantity INTEGER,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )`, (err) => {
      if (err) console.error('Error creating order_items table:', err);
      else console.log('Order items table ready');
    });

    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin'
    )`, (err) => {
      if (err) console.error('Error creating users table:', err);
      else console.log('Users table ready');
    });

    // Create customers table
    db.run(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      address TEXT,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) console.error('Error creating customers table:', err);
      else console.log('Customers table ready');
    });

    // Insert default admin user (password: admin)
    db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', 'admin', 'admin')`, (err) => {
      if (err) console.error('Error inserting admin user:', err);
      else console.log('Admin user ready');
    });

    // Insert default categories
    db.get('SELECT COUNT(*) as count FROM categories', (err, row) => {
      if (err) {
        console.error('Error checking categories:', err);
        return;
      }
      
      if (row && row.count === 0) {
        const defaultCategories = ['Engine Parts', 'Accessories', 'Tires'];
        defaultCategories.forEach(cat => {
          db.run('INSERT INTO categories (name) VALUES (?)', [cat], (err) => {
            if (err) console.error('Error inserting category:', err);
          });
        });
        console.log('Default categories inserted');
      }
    });

    // Insert sample products if table is empty
    db.get('SELECT COUNT(*) as count FROM products', (err, row) => {
      if (err) {
        console.error('Error checking products:', err);
        return;
      }
      
      if (row && row.count === 0) {
        // First get category IDs
        db.all('SELECT id, name FROM categories', (err, categories) => {
          if (err) return;
          
          const accessoriesId = categories.find(c => c.name === 'Accessories')?.id || 1;
          const tiresId = categories.find(c => c.name === 'Tires')?.id || 1;
          
          const sampleProducts = [
            ['Recaro Seat Black', 15000, 5, 'https://via.placeholder.com/200x150?text=Seat+Black', accessoriesId],
            ['Recaro Seat Red', 16000, 3, 'https://via.placeholder.com/200x150?text=Seat+Red', accessoriesId],
            ['Car Tire 17"', 8000, 10, 'https://via.placeholder.com/200x150?text=Tire+17', tiresId]
          ];
          
          sampleProducts.forEach(prod => {
            db.run('INSERT INTO products (name, price, stock, image, category_id) VALUES (?, ?, ?, ?, ?)', prod, (err) => {
              if (err) console.error('Error inserting sample product:', err);
            });
          });
          console.log('Sample products inserted');
        });
      }
    });
  });
}

// ========== CATEGORY ROUTES ==========

// Get all categories
app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories ORDER BY name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Add new category
app.post('/api/categories', (req, res) => {
  const { name } = req.body;
  db.run(
    'INSERT INTO categories (name) VALUES (?)',
    [name],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ id: this.lastID, message: 'Category added successfully' });
      }
    }
  );
});

// Delete category
app.delete('/api/categories/:id', (req, res) => {
  // First check if any products use this category
  db.get('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (row.count > 0) {
      res.status(400).json({ error: 'Cannot delete category with existing products' });
    } else {
      db.run('DELETE FROM categories WHERE id = ?', req.params.id, function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          res.json({ message: 'Category deleted successfully' });
        }
      });
    }
  });
});

// ========== PRODUCT ROUTES ==========

// Get all products with category names
app.get('/api/products', (req, res) => {
  db.all(`
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Add new product
app.post('/api/products', (req, res) => {
  const { name, price, stock, image, category_id } = req.body;
  db.run(
    'INSERT INTO products (name, price, stock, image, category_id) VALUES (?, ?, ?, ?, ?)',
    [name, price, stock, image, category_id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ id: this.lastID, message: 'Product added successfully' });
      }
    }
  );
});

// Update product
app.put('/api/products/:id', (req, res) => {
  const { name, price, stock, image, category_id } = req.body;
  db.run(
    'UPDATE products SET name = ?, price = ?, stock = ?, image = ?, category_id = ? WHERE id = ?',
    [name, price, stock, image, category_id, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ message: 'Product updated successfully' });
      }
    }
  );
});

// Update product stock
app.put('/api/products/:id/stock', (req, res) => {
  const { stock } = req.body;
  db.run(
    'UPDATE products SET stock = ? WHERE id = ?',
    [stock, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ message: 'Stock updated successfully' });
      }
    }
  );
});

// Delete product
app.delete('/api/products/:id', (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', req.params.id, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ message: 'Product deleted successfully' });
    }
  });
});

// ========== ORDER ROUTES ==========

// Create order
app.post('/api/orders', (req, res) => {
  const { customer_name, email, address, payment_method, items, total } = req.body;
  
  console.log('Creating order for:', customer_name);
  console.log('Items:', items);
  
  db.run(
    'INSERT INTO orders (customer_name, email, address, payment_method, total) VALUES (?, ?, ?, ?, ?)',
    [customer_name, email, address, payment_method, total],
    function(err) {
      if (err) {
        console.error('Error creating order:', err);
        res.status(500).json({ error: err.message });
      } else {
        const orderId = this.lastID;
        console.log('Order created with ID:', orderId);
        
        // Insert order items with quantities
        const stmt = db.prepare('INSERT INTO order_items (order_id, product_name, price, quantity) VALUES (?, ?, ?, ?)');
        items.forEach(item => {
          const quantity = item.quantity || 1;
          stmt.run(orderId, item.name, item.price, quantity, (err) => {
            if (err) console.error('Error inserting order item:', err);
          });
        });
        stmt.finalize();
        
        // Get order date
        db.get('SELECT order_date FROM orders WHERE id = ?', [orderId], async (err, row) => {
          const orderDetails = {
            orderId,
            customer_name,
            email,
            address,
            payment_method,
            items,
            total,
            order_date: row ? row.order_date : new Date().toISOString(),
            emailSent: false
          };
          
          // Send confirmation email (async)
          const emailResult = await sendOrderConfirmationEmail(orderDetails);
          orderDetails.emailSent = emailResult.success;
          
          if (emailResult.success) {
            console.log('✅ Email sent successfully');
          } else {
            console.log('📧 Email not sent:', emailResult.message);
          }
          
          // Respond with order ID and receipt data
          res.json({ 
            orderId, 
            message: 'Order placed successfully',
            receiptData: orderDetails
          });
        });
      }
    }
  );
});

// Get all orders
app.get('/api/orders', (req, res) => {
  db.all(`
    SELECT o.*, GROUP_CONCAT(oi.product_name) as products
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    GROUP BY o.id
    ORDER BY o.order_date DESC
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// ========== CUSTOMER ROUTES ==========

// Get all customers
app.get('/api/customers', (req, res) => {
  db.all('SELECT id, name, email, phone, address, created_at FROM customers ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Get customer by ID
app.get('/api/customers/:id', (req, res) => {
  db.get(
    'SELECT id, name, email, phone, address, created_at FROM customers WHERE id = ?',
    [req.params.id],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (row) {
        res.json(row);
      } else {
        res.status(404).json({ error: 'Customer not found' });
      }
    }
  );
});

// Update customer profile
app.put('/api/customers/:id', (req, res) => {
  const { name, phone, address, password } = req.body;
  const updates = [];
  const values = [];
  
  if (name) {
    updates.push('name = ?');
    values.push(name);
  }
  if (phone) {
    updates.push('phone = ?');
    values.push(phone);
  }
  if (address) {
    updates.push('address = ?');
    values.push(address);
  }
  if (password) {
    updates.push('password = ?');
    values.push(password);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  
  values.push(req.params.id);
  
  db.run(
    `UPDATE customers SET ${updates.join(', ')} WHERE id = ?`,
    values,
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ message: 'Profile updated successfully' });
      }
    }
  );
});

// Delete customer
app.delete('/api/customers/:id', (req, res) => {
  db.run('DELETE FROM customers WHERE id = ?', req.params.id, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ message: 'Customer deleted successfully' });
    }
  });
});

// Admin Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get(
    'SELECT * FROM users WHERE username = ? AND password = ?',
    [username, password],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (row) {
        res.json({ success: true, user: { id: row.id, username: row.username, role: row.role } });
      } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    }
  );
});

// Customer Signup
app.post('/api/customers/signup', (req, res) => {
  const { name, email, phone, address, password } = req.body;
  
  console.log('Signup request received:', { name, email, phone, address }); // Debug (don't log password)
  
  // Validate required fields
  if (!name || !email || !password) {
    console.log('Missing required fields');
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  
  db.run(
    'INSERT INTO customers (name, email, phone, address, password) VALUES (?, ?, ?, ?, ?)',
    [name, email, phone, address, password],
    function(err) {
      if (err) {
        console.error('Database error during signup:', err.message);
        if (err.message.includes('UNIQUE')) {
          res.status(400).json({ error: 'Email already exists' });
        } else if (err.message.includes('no such table')) {
          res.status(500).json({ error: 'Database not initialized. Please restart server.' });
        } else {
          res.status(500).json({ error: 'Database error: ' + err.message });
        }
      } else {
        console.log('Customer created successfully, ID:', this.lastID);
        res.json({ 
          success: true, 
          customer: { id: this.lastID, name, email },
          message: 'Account created successfully' 
        });
      }
    }
  );
});

// Customer Login
app.post('/api/customers/login', (req, res) => {
  const { email, password } = req.body;
  
  db.get(
    'SELECT id, name, email, phone, address FROM customers WHERE email = ? AND password = ?',
    [email, password],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (row) {
        res.json({ success: true, customer: row });
      } else {
        res.status(401).json({ success: false, message: 'Invalid email or password' });
      }
    }
  );
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});