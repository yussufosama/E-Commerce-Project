import mongoose from 'mongoose';
import { connectDatabase } from '../src/database/connection.js';
import { Product } from '../src/database/model/product.model.js';

const samples = [
  { name: '777 Oversized Tee', slug: '777-oversized-tee', category: 't-shirts', pricePiastres: 65000, description: 'Sample product: oversized black cotton tee.' },
  { name: 'After Hours Hoodie', slug: 'after-hours-hoodie', category: 'hoodies', pricePiastres: 125000, description: 'Sample product: relaxed charcoal hoodie.' },
  { name: 'Everyday Cargo', slug: 'everyday-cargo', category: 'pants', pricePiastres: 110000, description: 'Sample product: wide-leg black cargo pants.' },
];

try {
  await connectDatabase();
  await Product.init();
  for (const sample of samples) {
    const product = new Product({ ...sample, variants: ['S', 'M', 'L', 'XL'].map(size => ({ size, color: 'Black', stock: 10 })) });
    await product.validate();
    const { _id, ...data } = product.toObject();
    // Insert only missing samples. Never clear the catalog or overwrite edits.
    await Product.updateOne({ slug: sample.slug }, { $setOnInsert: data }, { upsert: true });
  }
  console.log('Sample products added; existing products were preserved. Prices and stock are demonstration values.');
} catch (error) {
  console.error('Seeding failed:', error.name, error.code || '');
  if (error.name === 'ValidationError' || error.name === 'MongoServerError') console.error(error.message);
  else console.error('Check your MongoDB connection and database permissions.');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
