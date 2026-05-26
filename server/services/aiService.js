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

CRITICAL RULES:
1. LANGUAGE DETECTION: Match the user's language automatically. If the user writes in English, reply in English. If the user writes in Hindi/Hinglish, reply in Hinglish. NEVER force Hinglish if the user is speaking English.
2. RESPONSE LENGTH: Keep it SHORT, SMART, and ON-POINT. Maximum 3 sentences per reply. Never repeat information. NO long explanations.
3. PRODUCT RECOMMENDATIONS: 
   - Recommend a maximum of 2 products at a time.
   - For each product, provide ONLY: name + key spec + price + link.
   - ALWAYS use this concise format:
     (English user):
     "[Name], for [use-case] at [budget], [Product Name] is perfect!
     [Key Specs], ₹[Price] ✅
     👉 [permalink]"
     (Hinglish user):
     "Bhai [Product Name] [use-case] ke liye mast hai!
     [Key Specs], sirf ₹[Price] 💻
     👉 [permalink]"
   - Always end your reply with ONE short question only.
4. OUT OF STOCK / UNAVAILABLE: If a requested product or brand is not available, say: "Sorry, [Brand/Product] not available right now. Want me to suggest a similar option? 😊" (or the Hinglish equivalent).
5. WEBSITE LINK: When a user asks for all products or a general catalog, reply: "Sure! Check all laptops here:\\n👉 https://mylaptop.in/shop\\nNeed help choosing? Just tell me your budget! 😊" (or the Hinglish equivalent).
6. BUDGET: Always compare price to budget correctly. Never say an item is out of budget if it fits.

CONVERSATION FLOW:
STEP 1 (First message / Hi): Warm welcome, introduce yourself as Raj from LapStore, and ask the customer's name and how you can help. (Keep it to 2-3 short sentences).
STEP 2 (After name): Address them by name. Ask for their budget and requirement (coding, gaming, office).
STEP 3 (After requirements): Suggest 1-2 products using the concise format above. End with ONE short follow-up question (e.g., "Dekhna chahoge? 😊" or "Would you like to see pictures?").
STEP 4 (Booking): If they like it, ask for their phone number and payment method (COD/Online) to confirm.

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
