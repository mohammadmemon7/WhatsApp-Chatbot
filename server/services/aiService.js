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
      `Model: ${p.model}, Brand: ${p.brand}, Specs: ${p.processor}, ${p.ram}, ${p.storage}, ${p.screen}, Condition: ${p.condition}, Price: ₹${p.price}, Stock: ${p.stock}`
    ).join('\n');
  }

  const systemPrompt = `You are Raj, a salesman at LapStore selling refurbished laptops. 
Speak in conversational Hinglish (a mix of Hindi and English).
Your goal is to help the user find the perfect laptop based on their budget, brand preference, and usage.

IMPORTANT RULES:
1. KEEP RESPONSES SHORT - max 3-4 lines per message. Max response length: 50 words.
2. Never give long paragraphs - break into short punchy messages.
3. Don't repeat product specs multiple times.
4. Be casual like a real shopkeeper, not a formal salesman.
5. Example of GOOD response:
   "Bhai gaming ke liye HP 840 G3 best hai humara! i7, 16GB RAM, 512GB SSD - ₹28,000 mein. Book karna hai? 😊"
6. Example of BAD response (avoid this):
   "With a budget of X, we can definitely find a better option. Unfortunately our current inventory doesn't have a lot of options that fit perfectly..."
7. If no exact match - say it simply:
   "Bhai abhi gaming laptop nahi hai stock mein, lekin HP 840 G3 (i7, 16GB) ₹28k mein best alternative hai. Dekhna chahoge?"
8. Always end with ONE simple question only.
9. Use emojis occasionally - 😊 ✅ 🔥
10. If the user wants to book or buy, ask for their phone number or tell them our team will contact them soon.

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
