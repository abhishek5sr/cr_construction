// api/chatbot.js - Backend for AI Chatbot
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// Enhanced response database
const knowledgeBase = {
  materials: {
    patterns: ['material', 'cement', 'brick', 'steel', 'sand', 'aggregate', 'what do you sell', 'products'],
    response: "We offer premium building materials: 🏗️ Cement & Concrete | 🔩 Steel & Reinforcement | 🧱 Bricks & Blocks | 🏔️ Sand & Aggregates | 🪵 Timber & Wood Products. Visit our Shop section for detailed catalog!"
  },
  pricing: {
    patterns: ['price', 'cost', 'how much', 'rate', 'expensive', 'cheap'],
    response: "💰 Pricing varies by material type, quantity, and delivery location. Cement: ₹300-450/bag | Bricks: ₹8-12/piece | Steel: ₹60-80/kg. For exact quotes, contact our sales team at +91 123 456 7890!"
  },
  services: {
    patterns: ['service', 'construction', 'build', 'project', 'contractor'],
    response: "🏠 Our services: 1) Home Construction | 2) Infrastructure Projects | 3) Corporate Solutions | 4) Renovation | 5) Project Consulting. Check our Services page for details!"
  },
  contact: {
    patterns: ['contact', 'phone', 'email', 'address', 'location', 'where are you'],
    response: "📞 Contact us: Phone: +91 123 456 7890 | Email: info@crbuildingsolutions.com | 📍 Address: 123 Construction Lane, Delhi, India | 🕒 Hours: Mon-Sat 9AM-6PM"
  },
  delivery: {
    patterns: ['delivery', 'shipping', 'transport', 'when will i get', 'order time'],
    response: "🚚 Delivery: Standard 2-3 days | Express 24 hours | Free delivery on orders above ₹50,000 | We serve Delhi/NCR region with reliable logistics partners."
  },
  sustainability: {
    patterns: ['sustainable', 'eco', 'green', 'environment', 'eco-friendly'],
    response: "🌱 We're committed to sustainability! We offer: Green building materials | Energy-efficient solutions | Waste management | LEED consulting. Visit Sustainability page!"
  },
  greeting: {
    patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
    response: "👋 Hello! Welcome to C&R Building Solutions! I'm your AI assistant. I can help with materials, pricing, services, and more. How can I assist you today?"
  },
  thanks: {
    patterns: ['thank', 'thanks', 'appreciate'],
    response: "🙏 You're welcome! Happy to help. Feel free to ask anything else about construction materials or services!"
  },
  default: {
    response: "🤖 I'm still learning about construction! For detailed information, please:\n1) Browse our Shop for materials\n2) Check Services for projects\n3) Call +91 123 456 7890\nHow else can I help?"
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, userId, sessionId } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    await client.connect();
    const db = client.db('cr_building');

    // Log the conversation
    await db.collection('chatbot_conversations').insertOne({
      userId: userId || 'anonymous',
      sessionId: sessionId || Date.now().toString(),
      userMessage: message,
      timestamp: new Date(),
      userAgent: req.headers['user-agent']
    });

    // Process the message and generate response
    const response = await generateAIResponse(message, db);

    // Get suggested questions
    const suggestions = getSuggestedQuestions(message);

    await client.close();

    res.status(200).json({
      response,
      suggestions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chatbot error:', error);
    await client.close();
    res.status(200).json({
      response: "⚠️ I'm having trouble connecting right now. Please call us at +91 123 456 7890 for immediate assistance.",
      suggestions: ['Contact support', 'Browse materials', 'View services'],
      timestamp: new Date().toISOString()
    });
  }
}

async function generateAIResponse(message, db) {
  const userMessage = message.toLowerCase().trim();
  
  // Check for exact matches in knowledge base
  for (const [category, data] of Object.entries(knowledgeBase)) {
    if (category === 'default') continue;
    
    const hasMatch = data.patterns.some(pattern => 
      userMessage.includes(pattern.toLowerCase())
    );
    
    if (hasMatch) {
      // Track popular queries
      await db.collection('chatbot_analytics').updateOne(
        { category },
        { 
          $inc: { count: 1 },
          $set: { lastAsked: new Date() }
        },
        { upsert: true }
      );
      
      return data.response;
    }
  }

  // Check for material-specific queries
  const materialQueries = {
    'cement': "We have multiple cement grades: OPC 53 Grade (₹350-450/bag) | PPC (₹320-400/bag) | PSC (₹380-480/bag). Bulk discounts available!",
    'brick': "Brick options: Red Clay Bricks (₹8-12/piece) | Fly Ash Bricks (₹10-14/piece) | AAC Blocks (₹2800-3500/m³). Quantity discounts apply!",
    'steel': "Steel products: TMT Bars (₹60-80/kg) | Structural Steel | Reinforcement Mesh. All ISI certified with quality guarantee!",
    'sand': "Sand varieties: River Sand (₹800-1200/ton) | M-Sand (₹600-900/ton) | Plastering Sand (₹700-1000/ton). Quality tested!"
  };

  for (const [material, response] of Object.entries(materialQueries)) {
    if (userMessage.includes(material)) {
      return response;
    }
  }

  return knowledgeBase.default.response;
}

function getSuggestedQuestions(userMessage) {
  const message = userMessage.toLowerCase();
  
  if (message.includes('material') || message.includes('cement') || message.includes('brick')) {
    return [
      'Cement prices and grades',
      'Brick types and sizes',
      'Steel quality and pricing',
      'Delivery for materials'
    ];
  }
  
  if (message.includes('price') || message.includes('cost')) {
    return [
      'Cement price per bag',
      'Brick pricing details', 
      'Steel rates today',
      'Bulk order discounts'
    ];
  }
  
  if (message.includes('service') || message.includes('construction')) {
    return [
      'Home construction process',
      'Infrastructure projects',
      'Corporate building solutions',
      'Get a project quote'
    ];
  }

  // Default suggestions
  return [
    'Building materials catalog',
    'Construction services',
    'Pricing and quotes', 
    'Contact information'
  ];
}