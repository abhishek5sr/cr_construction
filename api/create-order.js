// api/create-order.js
import { MongoClient } from 'mongodb';
import Razorpay from 'razorpay';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { items, userId } = req.body;  // Accept userId from frontend
  if (!items || items.length === 0) return res.status(400).json({ error: 'Cart empty' });
  if (!userId) return res.status(401).json({ error: 'User not authenticated' });

  try {
    await client.connect();
    const db = client.db('cr_building');

    let total = 0;
    const products = [];

    for (const item of items) {
      const product = await db.collection('products').findOne({ id: item.productId.toString() }); // Force string
      if (!product) return res.status(404).json({ error: `Product not found: ${item.productId}` });

      const qty = item.quantity > 0 ? item.quantity : 1;
      total += product.price * qty;

      products.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: qty
      });
    }

    const order = await razorpay.orders.create({
      amount: total * 100,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`
    });

    res.status(200).json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      products,
      userId  // Return userId for frontend
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Order creation failed' });
  } finally {
    await client.close();
  }
}