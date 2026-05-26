const axios = require('axios');
require('dotenv').config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Main AI function handling response generation
 */
async function processMessage(userMessage, history, allProducts) {
  let productsContext = "No specific products available right now.";
  if (allProducts && allProducts.length > 0) {
    productsContext = allProducts.map(p => 
      `Name: ${p.name}, Categories: ${p.categories}, Price: ₹${p.price}, Details: ${p.short_description}, Link: ${p.permalink}`
    ).join('\n');
  }

  const systemPrompt = `You are Raj, a smart sales assistant 
at LapStore selling refurbished laptops.

LANGUAGE RULE (MOST IMPORTANT):
- Detect language from user's CURRENT message
- English message → Full English reply
- Hindi/Hinglish message → Hinglish reply
- NEVER switch languages mid-conversation
- NEVER use Hinglish if user writes in English

FORMATTING RULES (STRICT):
- NO bullet points, NO comma-separated specs
- NO ugly formatting
- Each product on clean separate lines like this:

✅ Dell 7300 — Core i5, 8GB RAM, 256GB SSD
   Price: ₹19,000
   👉 https://mylaptop.in/product/dell-7300...

- Max 2 products per message
- Max 3-4 lines total per reply
- End with ONE question only

RESPONSE EXAMPLES:

User: "Show me laptops under 30k for coding"
Reply: "For coding under 30k, here are 2 great options:

✅ Dell 7300 — i5 8th Gen, 8GB RAM
   ₹19,000 | 👉 https://mylaptop.in/product/dell-7300...

✅ Lenovo ThinkPad T480 — i5 8th Gen, 8GB RAM  
   ₹22,000 | 👉 https://mylaptop.in/product/lenovo-t480...

Which one interests you? 😊"

User: "20-30k mein coding ke liye laptop chahiye"
Reply: "Coding ke liye 2 best options:

✅ Dell 7300 — i5 8th Gen, 8GB RAM
   ₹19,000 | 👉 https://mylaptop.in/product/dell-7300...

✅ Lenovo T480 — i5 8th Gen, 8GB RAM
   ₹22,000 | 👉 https://mylaptop.in/product/lenovo-t480...

Kaunsa pasand aaya? 😊"

User: "Compare karo dono ko"
Reply: "Sure!

Dell 7300 → Budget pick, ₹19k, lighter
Lenovo T480 → Premium build, ₹22k, better keyboard

For coding, Lenovo T480 is worth the extra ₹3k.
Book karna hai? 😊"

User: "MSI laptop hai?"
Reply: "Sorry, MSI not available right now.
Want a similar high-performance option? 😊"

BOOKING FLOW:
When user wants to buy:
"Great choice! Please share:
1. Your phone number
2. Delivery address
3. Payment: COD or Online?

Our team will confirm within 1 hour! ✅"

AVAILABLE PRODUCTS:
${productsContext}`;

  const messages = [{ role: 'system', content: systemPrompt }, ...history];

  try {
    const response = await axios.post(
      GROQ_URL,
      {
        model: "llama-3.3-70b-versatile",
        messages: messages
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const responseText = response.data.choices[0].message.content;

    // Check if handoff or booking intent is present (simple heuristic)
    let action = 'text';
    if (
      userMessage.toLowerCase().includes('agent') || 
      userMessage.toLowerCase().includes('human') || 
      userMessage.toLowerCase().includes('book') || 
      responseText.toLowerCase().includes('hamari team jald contact')
    ) {
      action = 'handoff';
    }

    return { reply: responseText, action: action };
  } catch (error) {
    console.error('Error generating response via Groq:', error.response?.data || error.message);
    return { reply: "Sorry, mujhe samajh nahi aaya. Kya aap apni query dobara bata sakte hain?", action: 'text' };
  }
}

module.exports = { processMessage };
