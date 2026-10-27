import { Router } from 'express';
import BloodRequest from '../models/BloodRequest.js';
import User from '../models/User.js';
import { auth, allowRoles } from '../middleware/auth.js';
import { sendEmail } from '../email.js';

const router = Router();
const io = () => globalThis.io;

router.get('/', auth, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { status: { $nin: ['cancelled'] } };
    const requests = await BloodRequest.find(filter).populate('requester', 'name').sort({ createdAt: -1 }).limit(100).lean();
    res.json({ requests: requests.map(r => ({ ...r, requester: r.requester ? { name: r.requester.name } : null, interestedCount: r.interestedDonors?.length || 0 })) });
  } catch { res.status(500).json({ message: 'Could not load requests.' }); }
});

router.post('/', auth, allowRoles('requester', 'admin'), async (req, res) => {
  try {
    const { patientName, bloodGroup, units, hospitalName, city, pinCode, neededBy, urgency = 'normal' } = req.body;
    if (!patientName || !bloodGroup || !units || !hospitalName || !city || !/^\d{6}$/.test(String(pinCode || '')) || !neededBy) return res.status(400).json({ message: 'Please complete all required fields and enter a valid 6-digit PIN code.' });
    if (new Date(neededBy) <= new Date()) return res.status(400).json({ message: 'Needed-by date must be in the future.' });
    const request = await BloodRequest.create({ requester: req.user._id, patientName, bloodGroup, units, hospitalName, city, pinCode, neededBy, urgency });
    const donors = await User.find({ role: 'donor', availableToContact: true, bloodGroup, $or: [{ city: new RegExp(`^${escapeRegex(city)}$`, 'i') }, { pinCode }] }).select('email name');
    await Promise.allSettled(donors.map(d => sendEmail({ to: d.email, subject: `BloodConnect: ${bloodGroup} blood request near you`, text: `Hello ${d.name},\nA ${bloodGroup} blood request has been posted in ${city}. Log in to BloodConnect to review it. Please only respond if you are willing and able to help; medical eligibility must be confirmed by a blood bank.` })));
    io()?.emit('request:created', { id: request._id, bloodGroup, city, urgency });
    res.status(201).json({ request, matchingDonorsNotified: donors.length });
  } catch (err) { res.status(400).json({ message: err.message || 'Could not create request.' }); }
});

router.post('/:id/interest', auth, allowRoles('donor'), async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request || ['cancelled', 'fulfilled'].includes(request.status)) return res.status(404).json({ message: 'This request is no longer active.' });
    if (req.user.bloodGroup !== request.bloodGroup) return res.status(400).json({ message: 'Your registered blood group does not match this request. A blood bank must confirm medical compatibility.' });
    if (!req.user.availableToContact) return res.status(400).json({ message: 'Please enable your donor contact preference in your profile first.' });
    if (!request.interestedDonors.some(id => id.equals(req.user._id))) request.interestedDonors.push(req.user._id);
    request.status = 'matched';
    await request.save();
    io()?.emit('request:updated', { id: request._id, status: request.status });
    const requester = await User.findById(request.requester);
    if (requester) await sendEmail({ to: requester.email, subject: 'A donor has responded to your BloodConnect request', text: `${req.user.name} has expressed interest in your ${request.bloodGroup} blood request. Please log in to coordinate safely. A medical team must confirm eligibility and compatibility.` });
    res.json({ message: 'Your interest has been recorded. Please coordinate through the requester and confirm all medical requirements with a blood bank.' });
  } catch { res.status(500).json({ message: 'Could not respond to request.' }); }
});

router.patch('/:id/status', auth, async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found.' });
    const isOwner = request.requester.equals(req.user._id);
    if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ message: 'Only the requester or admin can change this status.' });
    const allowed = ['pending', 'matched', 'fulfilled', 'cancelled'];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ message: 'Invalid status.' });
    request.status = req.body.status;
    await request.save();
    io()?.emit('request:updated', { id: request._id, status: request.status });
    res.json({ request });
  } catch { res.status(500).json({ message: 'Could not update request.' }); }
});

function escapeRegex(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
export default router;
