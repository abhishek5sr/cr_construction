// api/create-order.js
import { MongoClient, ObjectId } from 'mongodb';
import Razorpay from 'razorpay';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Invalid cart items' });
  }

  try {
    await client.connect();
    const db = client.db('cr_building');

    let totalAmount = 0;
    const products = [];

    for (const item of items) {
      const product = await db.collection('products').findOne({ _id: new ObjectId(item.productId) });
      if (!product) return res.status(404).json({ error: `Product ${item.productId} not found` });

      const qty = item.quantity || 1;
      totalAmount += product.price * qty;

      products.push({
        productId: product._id.toString(),  // ← CRITICAL: Convert to string
        name: product.name,
        price: product.price,
        quantity: qty
      });
    }

    const order = await razorpay.orders.create({
      amount: totalAmount * 100,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`
    });

    res.status(200).json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      products
    });

  } catch (error) {
    console.error('Create Order Error:', error);
    res.status(500).json({ error: 'Failed to create order. Try again later.' });
  } finally {
    await client.close();
  }
}