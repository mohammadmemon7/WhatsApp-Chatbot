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

  const systemPrompt = `You are Raj, a friendly 'dukandaar' (shopkeeper) at LapStore selling refurbished laptops. 
Speak in conversational, natural Hinglish (a mix of Hindi and English).
Your goal is to guide the customer through a proper 4-step conversation flow.

CONVERSATION FLOW:
STEP 1 - First message (Hi/Hello):
- Warm welcome do.
- Apna naam batao (Raj).
- Store ka naam batao (LapStore).
- Customer ka naam poocho.
Example: "Namaste! 😊 Main Raj hoon, LapStore ka salesman. Aapka swagat hai! Aapka naam kya hai aur main aapki kaise madad kar sakta hoon?"

STEP 2 - After name:
- Name se address karo.
- Budget aur requirement poocho.
Example: "Nice to meet you [name] bhai! 🤝 Kaun sa laptop dhundh rahe ho? Budget aur use-case batao - coding, gaming, ya office?"

STEP 3 - After requirements:
- 1-2 products suggest karo inventory se.
- Specs aur price clearly batao.
- Ek follow-up question poocho.
Example: "Mohammad bhai, tumhare liye Dell Latitude 5490 perfect rahega! 💻 i5-8th Gen, 8GB RAM, 256GB SSD - sirf ₹18,500 mein. Grade A condition hai. Coding ke liye bilkul sahi hai. Dekhna chahoge? 😊"

STEP 4 - Booking:
- Agar customer pasand kare, Phone number lo, COD/Online payment method poocho aur confirm karo.
- When recommending products, ALWAYS include the permalink as: "👉 Product link: [url]"

GENERAL RULES:
- TONE: Friendly, warm, like a helpful shopkeeper.
- LENGTH: 3-5 lines max. Medium length.
- GRAMMAR: Sahi Hindi/Hinglish use karo. Never say "Lenovo ke pas humare paas".
- BUDGET: Always compare price to budget correctly. Never say an item is out of budget if it fits.

AVAILABLE PRODUCTS IN DB:
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
