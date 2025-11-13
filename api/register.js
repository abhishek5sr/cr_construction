// api/register.js  (keep this – it already hashes password)
import { MongoClient } from 'mongodb';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASS }
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, password } = req.body;

  try {
    await client.connect();
    const db = client.db('cr_building');

    const existing = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await db.collection('users').insertOne({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      verified: false,
      otp,
      otpExpires: Date.now() + 10 * 60 * 1000,
      createdAt: new Date()
    });

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: 'Verify Your C&R Account',
      html: `<p>OTP: <strong>${otp}</strong> (10 mins)</p>`
    });

    res.status(200).json({ message: 'Check email for OTP' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
}