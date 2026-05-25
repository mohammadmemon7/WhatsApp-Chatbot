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
Always be friendly, conversational, and helpful.

IMPORTANT RULES:
1. Jab products pooche to neeche diye gaye AVAILABLE PRODUCTS list se fetch karke recommend kare.
2. Budget, brand, aur usage ke hisaab se suggest kare.
3. Max 2-3 products suggest kare at a time.
4. Always ask follow-up questions to understand their requirements better (e.g., "Aapko coding ke liye chahiye ya gaming ke liye?").
5. Example tone: "Arey bhai, Dell ka ek mast option hai aapke liye! i5 processor, 8GB RAM — coding ke liye perfect hai. Budget 18-20k mein fit bhi ho jayega!"
6. If the user wants to book or buy, ask for their phone number or tell them our team will contact them soon.

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
