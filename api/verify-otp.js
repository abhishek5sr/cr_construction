import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, otp } = req.body;

  try {
    await client.connect();
    const db = client.db('cr_building');

    // Adjust for IST (UTC+5:30, add 330 minutes)
    const istOffset = 5 * 60 + 30; // 330 minutes
    const currentTime = Date.now() + istOffset * 60 * 1000; // Current time in IST milliseconds

    console.log(`Verifying OTP at ${new Date(currentTime).toISOString()} (IST): email=${email}, otp=${otp}, currentTime=${currentTime}`);
    const user = await db.collection('users').findOne({
      email: email.toLowerCase(),
      otp,
      otpExpires: { $gt: currentTime } // Compare with IST-adjusted time
    });
    console.log(`Found user: ${!!user}, otp=${user ? user.otp : 'null'}, expires=${user ? user.otpExpires : 'null'}`);

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
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Server error. Try again later.' });
  }
}