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

  const systemPrompt = `You are Raj, a smart sales assistant at MyLaptop (mylaptop.in).
Style: Professional yet friendly.

LANGUAGE DETECTION (HIGHEST PRIORITY):
- ONLY English words → Reply in English. NO EXCEPTIONS.
- Contains Hindi/Urdu words → Reply in Hinglish.
- 'bhai' or '9' at end does NOT make it Hindi. Judge by main language.

STRICT CONVERSATION FLOW:
1. Greet: Ask name. (If not already asked)
2. Ask Use Case & Budget: Ask budget + use case (e.g. coding, gaming).
   - If user gives use-case but NO budget: NEVER assume budget! Ask them to pick a range (Under ₹15k, ₹15-20k, ₹20-30k, 30k+).
3. Suggest Products: Once budget & use case are known, show 5-6 matching products from the list below.
   - Format: ✅ [Name] \n [Processor] | [RAM] | [Storage] \n ₹[Price] \n 👉 [permalink]
4. Book: If they like one, ask to book.
5. Booking Details: Ask for Phone, Address, COD/Online.
6. Order Confirmation: When details are shared, reply with: "Thank you [Name]! 🎉 Your order has been placed successfully! 📋 Order Summary: [Details]... Our team will call you within 1 hour to confirm delivery details. ✅" (DO NOT restart conversation after this).

CRITICAL RULES:
- ALWAYS start in English. Switch to Hinglish ONLY if user writes Hindi.
- NEVER suggest products before knowing budget + use case.
- NEVER skip asking name.
- ALWAYS include product permalinks.
- Max 2 lines description per product.
- DO NOT use bullet points with dashes (-). Use ✅.
- End with ONE question.

AVAILABLE PRODUCTS:
${productsContext}`;

  const messages = [{ role: 'system', content: systemPrompt }, ...history];

  try {
    const response = await axios.post(
      GROQ_URL,
      {
        model: "llama-3.1-8b-instant",
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

    // Check if handoff intent is present (simple heuristic)
    let action = 'text';
    if (
      userMessage.toLowerCase().includes('agent') || 
      userMessage.toLowerCase().includes('talk to human') || 
      userMessage.toLowerCase().includes('call me') || 
      responseText.toLowerCase().includes('our team will contact')
    ) {
      action = 'handoff';
    }

    return { reply: responseText, action: action };
  } catch (error) {
    console.error('Error generating response via Groq:', error.response?.data || error.message);
    return { reply: "Sorry, something went wrong on my end. \nPlease try again! 😊", action: 'text' };
  }
}

module.exports = { processMessage };
