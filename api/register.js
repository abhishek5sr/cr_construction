import { MongoClient } from 'mongodb';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid'; // Install with: npm install uuid

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
    const verificationToken = uuidv4(); // Unique token
    const tokenExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiration

    console.log(`Registering: email=${email}, token=${verificationToken}, tokenExpires=${tokenExpires.toISOString()} (IST)`);
    const operation = existing
      ? await db.collection('users').updateOne(
          { email: email.toLowerCase() },
          {
            $set: {
              name,
              password: hashedPassword,
              verified: false,
              verificationToken,
              tokenExpires,
              createdAt: new Date()
            }
          }
        )
      : await db.collection('users').insertOne({
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          verified: false,
          verificationToken,
          tokenExpires,
          createdAt: new Date()
        });

    console.log(`Operation result: modifiedCount=${existing ? operation.modifiedCount : operation.insertedId}`);

    const verificationLink = `https://cr-building-solutions.vercel.app/verify-email?token=${verificationToken}&email=${encodeURIComponent(email.toLowerCase())}`;
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: 'Verify Your C&R Account',
      html: `<p>Please verify your account by clicking the link below:</p><p><a href="${verificationLink}">${verificationLink}</a></p><p>Link expires in 10 minutes.</p>`
    });

    await client.close();
    res.status(200).json({ message: 'Verification link sent to your email' });
  } catch (e) {
    await client.close();
    console.error('Register error:', e);
    res.status(500).json({ error: 'Server error. Try again later.' });
  }
}