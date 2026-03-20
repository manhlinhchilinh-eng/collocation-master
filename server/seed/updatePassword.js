// Script to update admin password
const { getDb, queryOne, runSql } = require('../config/db');
const bcrypt = require('bcryptjs');

async function updatePassword() {
  await getDb();
  const newPassword = '1993L1nh$';
  const hash = bcrypt.hashSync(newPassword, 10);
  runSql("UPDATE users SET password = ? WHERE username = 'admin'", [hash]);
  console.log('✅ Admin password updated successfully');
  
  // Verify
  const admin = queryOne("SELECT * FROM users WHERE username = 'admin'");
  const ok = bcrypt.compareSync(newPassword, admin.password);
  console.log('✅ Verification:', ok ? 'PASS' : 'FAIL');
}

updatePassword().catch(console.error);
