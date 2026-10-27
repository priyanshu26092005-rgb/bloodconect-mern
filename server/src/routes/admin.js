import { Router } from 'express';
import User from '../models/User.js';
import BloodRequest from '../models/BloodRequest.js';
import { auth, allowRoles } from '../middleware/auth.js';

const router = Router();
router.get('/stats', auth, allowRoles('admin'), async (_req, res) => {
  try {
    const [donors, requesters, requests, pending, fulfilled, recentRequests, recentUsers] = await Promise.all([
      User.countDocuments({ role: 'donor' }), User.countDocuments({ role: 'requester' }), BloodRequest.countDocuments(),
      BloodRequest.countDocuments({ status: 'pending' }), BloodRequest.countDocuments({ status: 'fulfilled' }),
      BloodRequest.find().populate('requester', 'name').sort({ createdAt: -1 }).limit(8).lean(),
      User.find({ role: { $ne: 'admin' } }).select('name email role city createdAt').sort({ createdAt: -1 }).limit(8).lean()
    ]);
    res.json({ stats: { donors, requesters, requests, pending, fulfilled }, recentRequests, recentUsers });
  } catch { res.status(500).json({ message: 'Could not load admin statistics.' }); }
});
router.patch('/requests/:id/verify', auth, allowRoles('admin'), async (req, res) => {
  try {
    const { verificationStatus } = req.body;
    if (!['verified', 'rejected', 'unverified'].includes(verificationStatus)) return res.status(400).json({ message: 'Invalid verification status.' });
    const request = await BloodRequest.findByIdAndUpdate(req.params.id, { verificationStatus }, { new: true });
    if (!request) return res.status(404).json({ message: 'Request not found.' });
    globalThis.io?.emit('request:updated', { id: request._id, verificationStatus });
    res.json({ request });
  } catch { res.status(500).json({ message: 'Could not verify request.' }); }
});
export default router;
