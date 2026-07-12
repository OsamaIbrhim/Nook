import { connectDatabase } from '../config/db.js';
import { User } from '../models/User.js';

const [name, email, password] = process.argv.slice(2);
if (!name || !email || !password || password.length < 8) {
  console.error('Usage: node src/scripts/createAdmin.js "Admin Name" admin@example.com password-at-least-8-chars');
  process.exit(1);
}
await connectDatabase();
const existing = await User.findOne({ email: email.toLowerCase() });
if (existing) { existing.role = 'admin'; existing.isActive = true; await existing.save(); console.log(`Promoted ${existing.email} to admin`); }
else { const user = await User.create({ name, email, password, role: 'admin' }); console.log(`Created admin ${user.email}`); }
process.exit(0);
