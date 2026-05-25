/**
 * Trim session history to keep only the last `maxLength` messages.
 * @param {Array} historyArray - The history of messages
 * @param {number} maxLength - Max number of messages to keep
 * @returns {Array} Trimmed history array
 */
function trimHistory(historyArray, maxLength = 6) {
  if (!Array.isArray(historyArray)) return [];
  if (historyArray.length <= maxLength) return historyArray;
  
  // Keep the most recent messages
  return historyArray.slice(-maxLength);
}

module.exports = { trimHistory };
