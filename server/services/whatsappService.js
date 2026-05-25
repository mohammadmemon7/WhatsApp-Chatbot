const axios = require('axios');
require('dotenv').config();

const META_TOKEN = process.env.META_TOKEN;
const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
const API_URL = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

/**
 * Send a plain text message via WhatsApp API
 * @param {string} to - WhatsApp number
 * @param {string} text - Message text
 */
async function sendTextMessage(to, text) {
  try {
    const response = await axios.post(
      API_URL,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: { preview_url: false, body: text }
      },
      {
        headers: {
          'Authorization': `Bearer ${META_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response ? error.response.data : error.message);
    throw error;
  }
}

module.exports = {
  sendTextMessage
};
