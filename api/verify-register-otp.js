import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP required' });
  }

  try {
    await client.connect();
    const db = client.db('cr_building');

    const user = await db.collection('users').findOne({ 
      email: email.toLowerCase(),
      otp,
      otpExpires: { $gt: new Date() }
    });

    if (!user) {
      await client.close();
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    // Mark user as verified and clear OTP fields
    await db.collection('users').updateOne(
      { email: email.toLowerCase() },
      { 
        $set: { verified: true },
        $unset: { otp: '', otpExpires: '' }
      }
    );

    await client.close();
    res.status(200).json({
      message: 'Email verified successfully! You can now log in.'
    });
  } catch (error) {
    await client.close();
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Server error. Try again later.' });
  }
}