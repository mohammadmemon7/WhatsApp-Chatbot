const axios = require('axios');
const { filterProducts } = require('./productFilter');
require('dotenv').config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Step 1: Extract criteria from user message.
 */
async function extractCriteria(userMessage) {
  const systemPrompt = `You are an AI assistant helping a user find a laptop. 
Extract the following information from the user's message if present: budget (a number), brand, processor, ram, usage.
Return ONLY a JSON object with these keys. If a key is not mentioned, omit it or set it to null.`;

  try {
    const response = await axios.post(
      GROQ_URL,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        response_format: { type: "json_object" }
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const jsonText = response.data.choices[0].message.content;
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Error extracting criteria via Groq:', error.response?.data || error.message);
    return {};
  }
}

/**
 * Step 2: Generate natural language response including products.
 */
async function generateResponse(history, products) {
  let productsContext = "No specific matching products found.";
  if (products && products.length > 0) {
    productsContext = products.map(p => 
      `Model: ${p.model}, Brand: ${p.brand}, Specs: ${p.processor}, ${p.ram}, ${p.storage}, ${p.screen}, Condition: ${p.condition}, Price: ₹${p.price}`
    ).join(' | ');
  }

  const systemPrompt = `You are Raj, a salesman at LapStore selling refurbished laptops. 
Speak in conversational Hinglish. 
Use the following available products to recommend 3-4 options if the user is looking for a laptop.
Format recommendations nicely in plain text without images.
Available Products: ${productsContext}
If the user wants to book, ask for their phone number. If they ask for an agent, acknowledge and say our team will contact them soon.
Keep it concise and helpful.`;

  // We prepend the system prompt to the history
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

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating response via Groq:', error.response?.data || error.message);
    return "Sorry, mujhe samajh nahi aaya. Kya aap apni query dobara bata sakte hain?";
  }
}

/**
 * Main AI function handling the 2-step process.
 */
async function processMessage(userMessage, history) {
  // Step 1: Extract criteria
  const criteria = await extractCriteria(userMessage);
  
  // Step 2: Query products
  let products = [];
  if (Object.keys(criteria).length > 0) {
    products = await filterProducts(criteria);
  }

  // Step 3: Generate response
  const responseText = await generateResponse(history, products);

  // Check if handoff or booking intent is present (simple heuristic)
  let action = 'text';
  if (userMessage.toLowerCase().includes('agent') || userMessage.toLowerCase().includes('human') || responseText.toLowerCase().includes('hamari team jald contact')) {
    action = 'handoff';
  }

  return { reply: responseText, action: action };
}

module.exports = { processMessage };
