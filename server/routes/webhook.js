const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Product = require('../models/Product');
const { getLiveProducts, searchProducts, getProductsByBudget, getProductsAboveBudget } = require('../services/woocommerceService');
const { processMessage } = require('../services/aiService');
const { sendTextMessage, sendInteractiveButtons } = require('../services/whatsappService');
const { notifyAgent } = require('../services/handoffService');
const { trimHistory } = require('../utils/sessionManager');
require('dotenv').config();

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

// Helper: send the 3 standard action buttons after a product list
async function sendActionButtons(waId) {
  await sendInteractiveButtons(waId, "Would you like to:", [
    { id: "action_call", title: "📞 Call Now" },
    { id: "action_more", title: "🔍 More Options" },
    { id: "action_category", title: "🔄 Change Category" }
  ]);
}

// Helper: fetch products based on stored budgetRange
async function fetchProductsForSession(session) {
  const bRange = (session.budgetRange || '').toLowerCase();
  if (bRange === 'under_20k' || bRange.includes('under') || (bRange.includes('20') && !bRange.includes('25'))) {
    return await getProductsByBudget(null, 20000, session.page || 1);
  } else if (bRange === 'above_25k' || bRange.includes('above') || (bRange.includes('25') && !bRange.includes('20'))) {
    return await getProductsAboveBudget(25000, session.page || 1);
  } else {
    return await getProductsByBudget(20000, 25000, session.page || 1);
  }
}

// Webhook Verification (GET)
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// Incoming messages (POST)
router.post('/', async (req, res) => {
  console.log("RAW BODY:", JSON.stringify(req.body));
  console.log('\n➡️ [Webhook] POST request received at /webhook');
  console.log('➡️ [Webhook] Body:', JSON.stringify(req.body, null, 2));
  
  const body = req.body;

  if (body.object === 'whatsapp_business_account') {
    res.status(200).send('EVENT_RECEIVED'); // ACK immediately
    console.log('➡️ [Webhook] Sent EVENT_RECEIVED 200 OK');

    for (const entry of body.entry) {
      const changes = entry.changes[0];
      
      // Check for message status updates (e.g., delivered, read)
      if (changes.value.statuses) {
        console.log('➡️ [Webhook] Status update received:', JSON.stringify(changes.value.statuses[0], null, 2));
        continue;
      }

      if (changes.value.messages && changes.value.messages[0]) {
        const msg = changes.value.messages[0];
        console.log('➡️ [Webhook] Message extracted:', JSON.stringify(msg, null, 2));
        
        const waId = msg.from;
        
        let userText = '';
        let buttonId = null;

        if (msg.type === 'text') {
          userText = msg.text.body;
        } else if (msg.type === 'interactive' && msg.interactive.type === 'button_reply') {
          userText = msg.interactive.button_reply.title;
          buttonId = msg.interactive.button_reply.id;
        } else {
          console.log(`➡️ [Webhook] Ignored message type: ${msg.type}`);
          continue;
        }

        const name = changes.value.contacts?.[0]?.profile?.name || '';

        try {
          // 1. Get or create session
          let session = await Session.findOne({ waId });
          if (!session) {
            session = new Session({ waId, name, history: [] });
          }

          if (session.status === 'handed_off') {
            if (userText.toLowerCase() === 'reset') {
              session.status = 'active';
              session.history = [];
              session.step = 1;
              session.category = null;
              session.useCase = null;
              session.budgetRange = null;
              await session.save();
            } else {
              await sendTextMessage(waId, "Our team will contact you soon!\nIf you have more questions,\ntype 'reset' to start fresh 😊");
              continue;
            }
          } else if (userText.toLowerCase() === 'reset') {
            session.history = [];
            session.step = 1;
            session.category = null;
            session.useCase = null;
            session.budgetRange = null;
            await session.save();
          }

          // Step 1: Any first message from user
          if (session.history.length === 0 || session.step === 1) {
            session.history.push({ role: 'user', content: userText });
            session.step = 2;
            session.lastActive = new Date();
            await session.save();
            await sendInteractiveButtons(waId, "Welcome to MyLaptop! 👋\nWhat are you looking for?", [
              { id: "cat_laptops", title: "💻 Laptops" },
              { id: "cat_cctv", title: "📷 CCTV & Security" },
              { id: "cat_amc", title: "🔧 AMC & Services" }
            ]);
            continue;
          }

          session.history.push({ role: 'user', content: userText });

          // Step 99: Conversation ended (CCTV/AMC selected)
          if (session.step === 99) {
            if (buttonId && buttonId.startsWith('cat_')) {
              session.step = 2;
              session.category = null;
              session.useCase = null;
              session.budgetRange = null;
              await session.save();
              // Don't continue, fall through to step 2
            } else {
              await sendTextMessage(waId, 
                "For further assistance, please contact:\n" +
                "📞 *+91 96196 11144*\n\n" +
                "Type 'reset' to start over 😊"
              );
              continue;
            }
          }

          // Step 2: Handle Category Selection
          if (session.step === 2) {
            const lowerText = userText.toLowerCase();
            if (buttonId === 'cat_laptops' || lowerText.includes('laptop')) {
              session.category = 'laptops';
              session.step = 3;
              await session.save();
              
              await sendInteractiveButtons(waId, "Great! Choose your use case:", [
                { id: "use_study", title: "🎓 Personal/Study" },
                { id: "use_office", title: "💼 Office Use" },
                { id: "use_coding", title: "💻 Coding" }
              ]);
              
              // Send second set of buttons after a small delay
              setTimeout(async () => {
                await sendInteractiveButtons(waId, "More use cases:", [
                  { id: "use_design", title: "🎨 Graphic/Design" },
                  { id: "use_gaming", title: "🎮 Gaming" }
                ]);
              }, 1000);
              continue;

            } else if (buttonId === 'cat_cctv' || lowerText.includes('cctv')) {
              session.step = 99;
              session.category = 'cctv';
              await session.save();
              await sendTextMessage(waId, "📞 Please connect with our executive:\n*+91 96196 11144*\nThey will assist you with CCTV & \nSecurity installation! 😊");
              continue;
            } else if (buttonId === 'cat_amc' || lowerText.includes('amc')) {
              session.step = 99;
              session.category = 'amc';
              await session.save();
              await sendTextMessage(waId, "📞 Please connect with our executive:\n*+91 96196 11144*\nThey will assist you with AMC & Services! 😊");
              continue;
            } else {
              // Fallback if not matching
              await sendInteractiveButtons(waId, "Please select an option:", [
                { id: "cat_laptops", title: "💻 Laptops" },
                { id: "cat_cctv", title: "📷 CCTV & Security" },
                { id: "cat_amc", title: "🔧 AMC & Services" }
              ]);
              continue;
            }
          }

          // Step 3: Handle Use Case Selection
          if (session.step === 3 && session.category === 'laptops') {
            if (buttonId && buttonId.startsWith('use_')) {
              session.useCase = buttonId.replace('use_', '');
            } else {
              session.useCase = userText;
            }
            session.step = 4;
            await session.save();
            
            await sendInteractiveButtons(waId, "What's your budget?", [
              { id: "budget_under_20k", title: "Under ₹20,000" },
              { id: "budget_20k_25k", title: "₹20k - ₹25k" },
              { id: "budget_above_25k", title: "Above ₹25,000" }
            ]);
            continue;
          }

          // Step 4: Handle budget selection and call AI
          if (session.step === 4 && session.category === 'laptops') {
            if (buttonId && buttonId.startsWith('budget_')) {
              session.budgetRange = buttonId.replace('budget_', '');
            } else {
              let text = userText.toLowerCase();
              if (text.includes('under') || (text.includes('20') && !text.includes('25'))) session.budgetRange = 'under_20k';
              else if (text.includes('above') || (text.includes('25') && !text.includes('20'))) session.budgetRange = 'above_25k';
              else session.budgetRange = '20k_25k';
            }
            
            session.step = 5;
            session.page = 1;
            await session.save();
            
            const aiPrompt = `User is looking for a refurbished laptop for ${session.useCase || 'general use'}. Their budget is ${session.budgetRange || 'flexible'}. Please suggest 5-6 relevant products with links.`;
            
            console.log(`➡️ [Webhook] Calling AI service for products: ${aiPrompt}`);
            
            // FIX 3: Use correct fetch function based on budgetRange
            const allProducts = await fetchProductsForSession(session);

            const formattedHistory = session.history.map(h => ({ role: h.role, content: h.content }));
            const { reply, action } = await processMessage(aiPrompt, formattedHistory, allProducts);
            
            if (action === 'handoff') {
              notifyAgent(waId, name, userText);
              session.status = 'handed_off';
            }

            // FIX 4: Send acknowledgment of selection
            await sendTextMessage(waId, `✅ Selected: ${userText}`);
            await sendTextMessage(waId, reply);
            
            // FIX 1: Send 3 action buttons after product list
            await sendActionButtons(waId);

            session.history.push({ role: 'assistant', content: reply });
            session.history = trimHistory(session.history, 6);
            session.lastActive = new Date();
            await session.save();
            continue;
          }

          // Step 5+: Action button handlers + Normal AI conversation
          if (session.step >= 5) {
            console.log(`➡️ [Webhook] Step 5+ handler for: ${waId}, buttonId: ${buttonId}`);

            // FIX 6: Change Category button - reset and show welcome buttons
            if (buttonId === 'action_category') {
              session.step = 1;
              session.category = null;
              session.useCase = null;
              session.budgetRange = null;
              session.history = [];
              session.page = 1;
              await session.save();
              await sendInteractiveButtons(waId,
                "Welcome to MyLaptop! 👋\nWhat are you looking for?", [
                { id: "cat_laptops", title: "💻 Laptops" },
                { id: "cat_cctv", title: "📷 CCTV & Security" },
                { id: "cat_amc", title: "🔧 AMC & Services" }
              ]);
              continue;
            }

            // Handle Call Now button
            if (buttonId === 'action_call') {
              await sendTextMessage(waId,
                "📞 Call us now: *+91 96196 11144*\nWe're happy to help! 😊"
              );
              continue;
            }

            // More Options button - use same budget/useCase from session
            if (buttonId === 'action_more') {
              session.page = (session.page || 1) + 1;
              await session.save();

              // Acknowledge the button click
              await sendTextMessage(waId, `✅ Selected: ${userText}`);

              const moreProducts = await fetchProductsForSession(session);

              // If WooCommerce returned no products, send apology — no fake AI data
              if (!moreProducts || moreProducts.length === 0) {
                await sendTextMessage(waId,
                  "😔 Sorry, we don't have more options in this budget range right now.\n\n" +
                  "For more choices, please reach out to us directly:\n" +
                  "📞 *+91 96196 11144*\n" +
                  "Our team will find the perfect laptop for you! 😊"
                );
                // Show limited buttons — no 'More Options' since nothing left
                await sendInteractiveButtons(waId, "What would you like to do?", [
                  { id: "action_call", title: "📞 Call Now" },
                  { id: "action_category", title: "🔄 Change Category" }
                ]);
                session.lastActive = new Date();
                await session.save();
                continue;
              }

              const morePrompt = `Show me more different laptop options for ${session.useCase || 'general'} use. IMPORTANT: Only use the products from the list I provided. Do not invent any products.`;
              const formattedHistory = session.history.map(h => ({ role: h.role, content: h.content }));
              const { reply, action } = await processMessage(morePrompt, formattedHistory, moreProducts);
              
              if (action === 'handoff') {
                notifyAgent(waId, name, userText);
                session.status = 'handed_off';
              }

              await sendTextMessage(waId, reply);
              await sendActionButtons(waId);

              session.history.push({ role: 'assistant', content: reply });
              session.history = trimHistory(session.history, 6);
              session.lastActive = new Date();
              await session.save();
              continue;
            }

            // Normal free-text AI conversation
            console.log(`➡️ [Webhook] Calling AI service for follow-up: ${waId}`);

            const allProducts = await fetchProductsForSession(session);
            
            const formattedHistory = session.history.map(h => ({ role: h.role, content: h.content }));
            const { reply, action } = await processMessage(userText, formattedHistory, allProducts);
            
            if (action === 'handoff') {
              notifyAgent(waId, name, userText);
              session.status = 'handed_off';
            }
            
            await sendTextMessage(waId, reply);
            await sendActionButtons(waId);

            session.history.push({ role: 'assistant', content: reply });
            session.history = trimHistory(session.history, 6);
            session.lastActive = new Date();
            await session.save();
            continue;
          }

        } catch (err) {
          console.error("Error processing message:", err);
        }
      }
    }
  } else {
    res.sendStatus(404);
  }
});

module.exports = router;
