import { Router } from 'express';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';

const router = Router();
router.get('/', auth, async (req, res) => {
  try {
    const { bloodGroup, city, pinCode } = req.query;
    const filter = { role: 'donor', availableToContact: true };
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (city) filter.city = { $regex: `^${escapeRegex(city)}$`, $options: 'i' };
    if (pinCode) filter.pinCode = pinCode;
    const donors = await User.find(filter).select('name bloodGroup city pinCode availableToContact').sort({ city: 1 }).limit(100).lean();
    res.json({ donors: donors.map(d => ({ id: d._id, name: d.name, bloodGroup: d.bloodGroup, city: d.city, pinCode: d.pinCode })) });
  } catch { res.status(500).json({ message: 'Could not search donors.' }); }
});
function escapeRegex(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
export default router;
