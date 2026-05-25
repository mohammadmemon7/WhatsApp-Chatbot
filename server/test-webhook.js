const payload = {
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "1530786428624352",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "15556515196",
          "phone_number_id": "1146690765192074"
        },
        "contacts": [{ "profile": { "name": "Test User" }, "wa_id": "919860822471" }],
        "messages": [{
          "from": "919860822471",
          "id": "test_msg_001",
          "timestamp": "1704067200",
          "text": { "body": "Hi" },
          "type": "text"
        }]
      },
      "field": "messages"
    }]
  }]
};

async function testWebhook() {
  console.log("Sending payload to http://localhost:3000/webhook ...");
  try {
    const response = await fetch('http://localhost:3000/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const text = await response.text();
    console.log(`\nStatus: ${response.status}`);
    console.log(`Response Body: ${text}`);
  } catch (error) {
    console.error("\nError connecting to localhost:3000:", error.message);
    console.error("Make sure your local server is running (e.g., node index.js) before testing.");
  }
}

testWebhook();
