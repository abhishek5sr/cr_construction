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

  const { items } = req.body; // items: [{ productId, quantity }]

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
      totalAmount += product.price * (item.quantity || 1);
      products.push({ _id: product._id, name: product.name, price: product.price, quantity: item.quantity || 1 });
    }

    const order = await razorpay.orders.create({
      amount: totalAmount * 100, // in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`
    });

    await client.close();
    res.status(200).json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      products
    });
  } catch (error) {
    await client.close();
    console.error(error);
    res.status(500).json({ error: 'Failed to create order. Try again later.' });
  }
}