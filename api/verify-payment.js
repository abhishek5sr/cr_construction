// api/verify-payment.js
import { MongoClient, ObjectId } from 'mongodb';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, items, amount } = req.body;

  try {
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid signature' });
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

    await client.close();
    res.status(200).json({ success: true, message: 'Payment verified and order saved' });
  } catch (error) {
    await client.close();
    console.error(error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
}