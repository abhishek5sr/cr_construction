// api/products.js
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    await client.connect();
    const db = client.db('cr_building');
    const products = await db.collection('products').find({}).toArray();

    const plain = products.map(p => ({
      _id: p._id?.toString(),
      id: p.id,           // ← Your custom ID: "1", "2"
      name: p.name,
      price: p.price,
      image: p.image
    }));

    res.status(200).json(plain);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load products' });
  } finally {
    await client.close();
  }
}