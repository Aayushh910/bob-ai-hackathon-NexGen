import apiClient from './client';

/**
 * Send inquiry to SentinelAI Chatbot API.
 * @param {Object} params
 * @param {string} params.message
 * @param {string} [params.conversationId]
 * @param {Array<{role: string, content: string}>} [params.history]
 * @returns {Promise<Object>}
 */
export async function sendChatMessage({ message, conversationId = null, history = [], requestId = null }) {
  return await apiClient('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      message: String(message || '').trim(),
      conversationId,
      history: Array.isArray(history) ? history : [],
      requestId,
    }),
  });
}

export default sendChatMessage;
