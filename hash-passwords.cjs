const bcrypt = require('bcryptjs');
const passwords = ["password123", "testpass"];
passwords.forEach(pass => {
  const hash = bcrypt.hashSync(pass, 10);
  console.log(`Password: ${pass} -> Hash: ${hash}`);
});