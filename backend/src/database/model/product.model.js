import mongoose from 'mongoose';

export const categories = ['t-shirts', 'hoodies', 'pants', 'accessories'];
export const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ONE SIZE'];

const variantSchema = new mongoose.Schema({
  size: { type: String, enum: sizes, required: true },
  color: { type: String, required: true, trim: true, maxlength: 40 },
  stock: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  slug: { type: String, required: true, unique: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  description: { type: String, required: true, trim: true, maxlength: 3000 },
  category: { type: String, enum: categories, required: true },
  // Store money as integer piastres: 65000 = EGP 650.00.
  pricePiastres: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  currency: { type: String, enum: ['EGP'], default: 'EGP' },
  images: [{ type: String, validate: value => /^https:\/\//.test(value) }],
  variants: {
    type: [variantSchema],
    validate: {
      validator: values => values.length > 0 && new Set(values.map(v => `${v.size}:${v.color.toLowerCase()}`)).size === values.length,
      message: 'Provide at least one variant; each size/color combination must be unique.',
    },
  },
  active: { type: Boolean, default: true },
}, { timestamps: true });

productSchema.index({ active: 1, category: 1, createdAt: -1 });

export const Product = mongoose.model('Product', productSchema);
