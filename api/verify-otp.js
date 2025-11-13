import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, otp } = req.body;

  try {
    await client.connect();
    const db = client.db('cr_building');

    const user = await db.collection('users').findOne({
      email: email.toLowerCase(),
      otp,
      otpExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ error: 'Invalid or expired OTP' });

    if (!user.verified) {
      await db.collection('users').updateOne(
        { email: email.toLowerCase() },
        { $set: { verified: true, otp: null, otpExpires: null } }
      );
    } else {
      await db.collection('users').updateOne(
        { email: email.toLowerCase() },
        { $set: { otp: null, otpExpires: null } }
      );
    }

    const userData = await db.collection('users').findOne(
      { email: email.toLowerCase() },
      { projection: { password: 0, otp: 0, otpExpires: 0 } }
    );

    await client.close();
    res.status(200).json({ message: 'Success', user: userData });
  } catch (error) {
    await client.close();
    console.error(error);
    res.status(500).json({ error: 'Server error. Try again later.' });
  }
}