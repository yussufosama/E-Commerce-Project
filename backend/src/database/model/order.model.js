import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  idempotencyKey: { type: String, required: true },
  requestHash: { type: String, required: true },
  items: [{ product: mongoose.Schema.Types.ObjectId, name: String, size: String, color: String, quantity: Number, pricePiastres: Number, _id: false }],
  address: { name: String, phone: String, governorate: String, city: String, street: String, postalCode: String, country: { type: String, default: 'EG' } },
  subtotalPiastres: Number,
  shippingPiastres: Number,
  totalPiastres: Number,
  currency: { type: String, default: 'EGP', enum: ['EGP'] },
  paymentMethod: { type: String, default: 'cash_on_delivery', enum: ['cash_on_delivery'] },
  paymentStatus: { type: String, default: 'unpaid', enum: ['unpaid', 'paid'] },
  status: { type: String, default: 'pending', enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] },
}, { timestamps: true });
schema.index({ user: 1, idempotencyKey: 1 }, { unique: true });
// Internal retry bookkeeping is needed by services, not API consumers.
schema.set('toJSON', { transform(_document, result) {
  delete result.requestHash;
  delete result.idempotencyKey;
  delete result.__v;
  return result;
} });
export const Order = mongoose.model('Order', schema);
