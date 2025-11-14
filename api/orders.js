// api/orders.js
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = req.query;

  try {
    await client.connect();
    const db = client.db('cr_building');
    const query = userId ? { userId: new ObjectId(userId) } : {};
    const orders = await db.collection('orders').find(query).toArray();
    await client.close();
    res.status(200).json(orders);
  } catch (e) {
    await client.close();
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch orders. Try again later.' });
  }
}