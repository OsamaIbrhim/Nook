import { Product } from '../models/Product.js';

export async function restoreOrderInventory(order, session) {
  if (!order.inventoryReserved) return;
  for (const item of order.items) {
    await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }, { session });
  }
  order.inventoryReserved = false;
}

export async function releaseExpiredUnstartedReservations(Order, mongoose) {
  const expired = await Order.find({
    status: 'pending', paymentStatus: 'unpaid', inventoryReserved: true,
    stripeCheckoutSessionId: { $exists: false }, reservationExpiresAt: { $lte: new Date() }
  }).select('_id').limit(100).lean();
  for (const candidate of expired) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const order = await Order.findOne({
          _id: candidate._id, status: 'pending', paymentStatus: 'unpaid', inventoryReserved: true,
          stripeCheckoutSessionId: { $exists: false }, reservationExpiresAt: { $lte: new Date() }
        }).session(session);
        if (!order) return;
        await restoreOrderInventory(order, session);
        order.status = 'cancelled';
        order.statusHistory.push({ status: 'cancelled' });
        await order.save({ session });
      });
    } catch (error) { console.error(`Failed to release reservation ${candidate._id}:`, error.message); }
    finally { await session.endSession(); }
  }
}
