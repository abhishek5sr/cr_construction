// api/verify-payment.js
import { MongoClient, ObjectId } from 'mongodb';
import crypto from 'crypto';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, items, amount } = req.body;

  try {
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }

    await client.connect();
    const db = client.db('cr_building');
    await db.collection('orders').insertOne({
      userId: new ObjectId(userId),
      items,
      amount: amount / 100,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      status: 'paid',
      createdAt: new Date()
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  } finally {
    await client.close();
  }
}