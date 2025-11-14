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
    if (existing && existing.verified) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10-minute expiration

    console.log(`Registering: email=${email}, otp=${otp}, otpExpires=${otpExpires.toISOString()} (IST)`);
    const operation = existing
      ? await db.collection('users').updateOne(
          { email: email.toLowerCase() },
          {
            $set: {
              name,
              password: hashedPassword,
              verified: false,
              otp,
              otpExpires,
              createdAt: new Date()
            }
          }
        )
      : await db.collection('users').insertOne({
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          verified: false,
          otp,
          otpExpires,
          createdAt: new Date()
        });

    console.log(`Operation result: modifiedCount=${existing ? operation.modifiedCount : operation.insertedId}`);

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: 'Verify Your C&R Account',
      html: `<p>Your verification OTP: <strong>${otp}</strong></p><p>Valid for 10 minutes.</p>`
    });

    await client.close();
    res.status(200).json({ 
      message: 'OTP sent to your email',
      redirect: `/verify-otp.html?email=${encodeURIComponent(email.toLowerCase())}`
    });
  } catch (e) {
    await client.close();
    console.error('Register error:', e);
    res.status(500).json({ error: 'Server error. Try again later.' });
  }
}