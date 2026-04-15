// Save this as: check-database.js
// Run with: node check-database.js

const sqlite3 = require('sqlite3').verbose();

console.log('🔍 Checking database...\n');

const db = new sqlite3.Database('./johnrick_auto.db', (err) => {
  if (err) {
    console.error('❌ Cannot open database:', err.message);
    process.exit(1);
  }
  console.log('✅ Database opened successfully\n');
});

// Check if customers table exists
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='customers'", (err, row) => {
  if (err) {
    console.error('❌ Error checking tables:', err.message);
  } else if (row) {
    console.log('✅ Customers table exists\n');
    
    // Show table structure
    db.all("PRAGMA table_info(customers)", (err, columns) => {
      if (err) {
        console.error('❌ Error getting table info:', err.message);
      } else {
        console.log('📋 Customers table structure:');
        columns.forEach(col => {
          console.log(`   - ${col.name} (${col.type})`);
        });
        console.log('');
      }
      
      // Count existing customers
      db.get("SELECT COUNT(*) as count FROM customers", (err, row) => {
        if (err) {
          console.error('❌ Error counting customers:', err.message);
        } else {
          console.log(`👥 Total customers: ${row.count}\n`);
          
          // Show all customers (without passwords)
          if (row.count > 0) {
            db.all("SELECT id, name, email, phone, created_at FROM customers", (err, rows) => {
              if (!err && rows) {
                console.log('📋 Existing customers:');
                rows.forEach(customer => {
                  console.log(`   ${customer.id}. ${customer.name} (${customer.email})`);
                });
                console.log('');
              }
            });
          }
        }
        
        // Check other tables
        checkOtherTables();
      });
    });
  } else {
    console.log('❌ Customers table does NOT exist!');
    console.log('   Solution: Restart your server to create the table\n');
    checkOtherTables();
  }
});

function checkOtherTables() {
  setTimeout(() => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
      if (err) {
        console.error('❌ Error listing tables:', err.message);
      } else {
        console.log('📊 All tables in database:');
        tables.forEach(table => {
          console.log(`   - ${table.name}`);
        });
        console.log('');
      }
      
      db.close(() => {
        console.log('✅ Database check complete!\n');
        
        console.log('💡 Next steps:');
        console.log('   1. If customers table is missing, restart your server');
        console.log('   2. Check server terminal for any error messages');
        console.log('   3. Try signing up again');
        console.log('   4. Check browser console (F12) for errors\n');
      });
    });
  }, 500);
}