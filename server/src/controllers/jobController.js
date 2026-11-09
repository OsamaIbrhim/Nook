import { asyncHandler } from '../utils/asyncHandler.js';
import { releaseExpiredReservations } from '../services/inventoryService.js';

const SWEEP_BATCH = 100;

export const releaseReservations = asyncHandler(async (req, res) => {
  const released = await releaseExpiredReservations({ now: req.app.locals.now(), limit: SWEEP_BATCH });
  res.json({ success: true, data: { released } });
});
