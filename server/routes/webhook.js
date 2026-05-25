const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Product = require('../models/Product');
const { processMessage } = require('../services/aiService');
const { sendTextMessage } = require('../services/whatsappService');
const { notifyAgent } = require('../services/handoffService');
const { trimHistory } = require('../utils/sessionManager');
require('dotenv').config();

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

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
        
        // Only handle text messages for now
        if (msg.type !== 'text') {
          console.log(`➡️ [Webhook] Ignored non-text message. Type: ${msg.type}`);
          continue;
        }

        const userText = msg.text.body;
        const name = changes.value.contacts?.[0]?.profile?.name || '';

        try {
          // 1. Get or create session
          let session = await Session.findOne({ waId });
          if (!session) {
            session = new Session({ waId, name, history: [] });
          }

          if (session.status === 'handed_off') {
            // Do not process messages if handed off, unless they type 'reset'
            if (userText.toLowerCase() === 'reset') {
              session.status = 'active';
              session.history = [];
              await session.save();
              await sendTextMessage(waId, "Aapka session reset ho gaya hai. Main Raj, kaise help kar sakta hoon?");
            }
            continue;
          }

          // 2. Add user message to history
          session.history.push({ role: 'user', content: userText });

          // 3. Process with AI
          console.log(`➡️ [Webhook] Calling AI service (groq) for user: ${waId}`);
          const allProducts = await Product.find({ stock: { $gt: 0 } });
          const formattedHistory = session.history.map(h => ({ role: h.role, content: h.content }));
          const { reply, action } = await processMessage(userText, formattedHistory, allProducts);
          console.log(`➡️ [Webhook] AI response received:`, reply);

          // 4. Handle actions
          if (action === 'handoff') {
            console.log(`➡️ [Webhook] Handoff action triggered for user: ${waId}`);
            notifyAgent(waId, name, userText);
            session.status = 'handed_off';
          }

          // 5. Send reply via WhatsApp
          console.log(`➡️ [Webhook] Sending reply via WhatsApp to ${waId}...`);
          await sendTextMessage(waId, reply);
          console.log(`➡️ [Webhook] Reply sent successfully!`);

          // 6. Add assistant reply to history and trim
          session.history.push({ role: 'assistant', content: reply });
          session.history = trimHistory(session.history, 6);
          session.lastActive = new Date();

          await session.save();

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
