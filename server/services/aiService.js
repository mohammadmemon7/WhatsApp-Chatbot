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
   - ALWAYS end the product list with:
     "Have any queries? Want to know more about a specific laptop? Just ask! 😊
     Or call us: *+91 96196 11144*"
4. Book: If they like one, ask to book.
5. Booking Details: When user wants to book, ask conversationally:
   'Great choice! Please share:
   📱 Phone number
   📍 Delivery address
   💳 COD or Online payment?
   Our team confirms within 1 hour! ✅'
   NEVER show a form with blank fields like 'Name: ___' or 'Address: ___'.
6. Order Confirmation: When details are shared, reply with EXACTLY this format:
   "Thank you! 🎉 Order placed!
   
   📋 Order Summary:
   💻 [Product]
   📱 [Phone]
   📍 [Address]
   💳 [Payment]
   
   Our team will call you within 1 hour! ✅
   Questions? Call: *+91 96196 11144*"
   (DO NOT restart conversation after this).

CRITICAL RULES:
- ALWAYS start in English. Switch to Hinglish ONLY if user writes Hindi.
- NEVER suggest products before knowing budget + use case.
- NEVER skip asking name. NEVER assume or make up the customer's name. If name was not provided, just say 'Thank you!' without any name.
- ALWAYS include product permalinks.
- NEVER add description sentences after product specs. Only show Name, Specs, Price, Link. Nothing else per product.
- When showing product list, start DIRECTLY with the product suggestions line like: 'Here are the best options for [use-case]:' NO greetings before product list.
- DO NOT use bullet points with dashes (-). Use ✅.
- End with ONE question.
- For general fallback or conversational responses, ALWAYS add at the very end: "Need help? Call: *+91 96196 11144* 😊"

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
