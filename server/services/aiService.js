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

  const systemPrompt = `You are Raj, a friendly 'dukandaar' (shopkeeper) at LapStore selling refurbished laptops. 
Speak in conversational, natural Hinglish (jaise ek real bhai baat kar raha ho).
Your goal is to help the user find the perfect laptop based on their budget, brand preference, and usage.

STRICT RULES:
1. TONE: Friendly dukandaar - jaise ek real bhai baat kar raha ho. Never sound robotic.
2. LENGTH: 2-3 short sentences max. Max 40 words per response.
3. GRAMMAR: Sahi Hindi/Hinglish grammar use karo. NEVER say grammatically incorrect phrases like "Lenovo ke pas humare paas".
4. LOGIC & BUDGET: Price ko budget se compare karke sahi bolo. NEVER say an item is out of budget if it actually fits the budget. Always match the product correctly to their stated budget.
5. RECOMMENDATION: Ek hi product recommend karo at a time, uske baad ek hi question pucho.
6. Example of GOOD response (User wants Lenovo):
   "Bhai Lenovo mein ThinkPad T470 hai - i5, 8GB RAM, 256GB SSD, ₹15,000 mein. Kaafi solid machine hai! Coding/office use ke liye perfect. Book karein? 😊"
7. Example of GOOD response (User budget 30-40k):
   "30-40k mein aapke liye HP 840 G3 best rahega - i7, 16GB RAM, ₹28k mein. Gaming aur heavy work dono ke liye mast hai! Interest hai? 🔥"
8. If no exact match:
   "Bhai abhi gaming laptop nahi hai stock mein, lekin HP 840 G3 (i7, 16GB) ₹28k mein best alternative hai. Dekhna chahoge?"
9. If the user wants to book or buy, ask for their phone number or tell them our team will contact them soon.

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
