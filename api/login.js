import { MongoClient } from 'mongodb';
import nodemailer from 'nodemailer';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS
  }
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;

  try {
    await client.connect();
    const db = client.db('cr_building');

    const user = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ error: 'User not found' });
    if (!user.verified) return res.status(400).json({ error: 'Verify email first' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await db.collection('users').updateOne(
      { email: email.toLowerCase() },
      { $set: { otp, otpExpires: Date.now() + 5 * 60 * 1000 } }
    );

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: 'Login OTP - C&R',
      html: `<p>Your login OTP: <strong>${otp}</strong></p><p>Valid for 5 mins.</p>`
    });

    res.status(200).json({ message: 'OTP sent!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
}