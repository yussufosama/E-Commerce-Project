import mongoose from 'mongoose';

const item = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  size: { type: String, required: true },
  color: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1, max: 10 },
}, { _id: false });
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  items: { type: [item], default: [] },
}, { timestamps: true, optimisticConcurrency: true });
export const Cart = mongoose.model('Cart', schema);
