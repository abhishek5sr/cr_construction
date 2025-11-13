import { MongoClient } from 'mongodb';
import Razorpay from 'razorpay';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { productId, quantity = 1 } = req.body;

  try {
    await client.connect();
    const db = client.db('cr_building');

    const product = await db.collection('products').findOne({ _id: productId });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const order = await razorpay.orders.create({
      amount: product.price * quantity * 100,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`
    });

    await client.close();
    res.status(200).json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      product: { name: product.name, price: product.price },
      quantity
    });
  } catch (error) {
    await client.close();
    console.error(error);
    res.status(500).json({ error: 'Payment failed. Try again later.' });
  }
}