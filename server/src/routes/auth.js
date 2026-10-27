import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';

const router = Router();
const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'donor', bloodGroup, city, pinCode, phone, availableToContact = false } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required.' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    if (!['donor', 'requester'].includes(role)) return res.status(400).json({ message: 'Invalid registration role.' });
    if (role === 'donor' && bloodGroup && !groups.includes(bloodGroup)) return res.status(400).json({ message: 'Invalid blood group.' });
    const normalizedEmail = email.toLowerCase().trim();
    if (await User.findOne({ email: normalizedEmail })) return res.status(409).json({ message: 'An account with this email already exists.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email: normalizedEmail, passwordHash, role, bloodGroup: role === 'donor' ? bloodGroup : undefined, city, pinCode: pinCode || undefined, phone, availableToContact: role === 'donor' && Boolean(availableToContact) });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: safeUser(user) });
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ message: Object.values(err.errors).map(e => e.message).join(', ') });
    res.status(500).json({ message: 'Could not register. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || '').toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) return res.status(401).json({ message: 'Incorrect email or password.' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: safeUser(user) });
  } catch { res.status(500).json({ message: 'Could not log in.' }); }
});

router.get('/me', auth, (req, res) => res.json({ user: safeUser(req.user) }));
router.patch('/me', auth, async (req, res) => {
  try {
    const allowed = ['name', 'bloodGroup', 'city', 'pinCode', 'phone', 'availableToContact', 'lastDonationDate'];
    for (const key of allowed) if (req.body[key] !== undefined) req.user[key] = req.body[key];
    await req.user.save();
    res.json({ user: safeUser(req.user) });
  } catch (err) { res.status(400).json({ message: err.message || 'Could not update profile.' }); }
});

function safeUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role, bloodGroup: user.bloodGroup, city: user.city, pinCode: user.pinCode, phone: user.phone, availableToContact: user.availableToContact, lastDonationDate: user.lastDonationDate };
}
export default router;
