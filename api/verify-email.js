import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { token, email } = req.query;

  try {
    await client.connect();
    const db = client.db('cr_building');

    // Adjust for IST (UTC+5:30, add 330 minutes)
    const istOffset = 5 * 60 + 30; // 330 minutes
    const currentTime = Date.now() + istOffset * 60 * 1000;

    console.log(`Verifying email at ${new Date(currentTime).toISOString()} (IST): email=${email}, token=${token}, currentTime=${currentTime}`);
    const user = await db.collection('users').findOne({
      email: email.toLowerCase(),
      verificationToken: token,
      tokenExpires: { $exists: true, $gt: currentTime }
    });

    console.log(`Found user: ${!!user}, token=${user ? user.verificationToken : 'null'}, expires=${user ? user.tokenExpires : 'null'}`);

    if (!user) return res.status(400).json({ error: 'Invalid or expired verification link' });

    await db.collection('users').updateOne(
      { email: email.toLowerCase() },
      { $set: { verified: true, verificationToken: null, tokenExpires: null } }
    );

    await client.close();
    // Redirect to login page
    res.setHeader('Location', '/login.html');
    res.status(302).end();
  } catch (error) {
    await client.close();
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Server error. Try again later.' });
  }
}