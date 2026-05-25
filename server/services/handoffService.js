/**
 * Service to handle human agent handoff.
 */
function notifyAgent(waId, name, lastMessage) {
  console.log('-------------------------------------------');
  console.log(`HANDOFF ALERT: Customer requires human agent.`);
  console.log(`WhatsApp ID: ${waId}`);
  console.log(`Name: ${name || 'Unknown'}`);
  console.log(`Last Message: ${lastMessage}`);
  console.log('-------------------------------------------');
  
  // Here we could implement Email, Telegram, or internal dashboard notifications.
  // For now, we simulate with a console log.
}

module.exports = { notifyAgent };
