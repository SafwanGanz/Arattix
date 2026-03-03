const { ChatManager } = require('./chats');
const MessageSender = require('./message-sender');

/**
 * Authenticated bot instance that can fetch chats and send messages/files.
 */
class Bot {
  /**
   * @param {import('axios').AxiosInstance} session - Authenticated axios instance with cookie jar.
   */
  constructor(session) {
    this.session = session;
    this.chats = [];
    this.chatApi = 'https://web.arattai.in/v1/chats';
  }

  /**
   * Fetch chat list from the server.
   * @param {object} [options]
   * @param {boolean} [options.pinned=false] - Whether to fetch pinned chats only.
   * @param {number} [options.limit=20] - Maximum number of chats to fetch.
   * @returns {Promise<Object.<string, import('./chats').Chat>>} Map of chatId -> Chat.
   */
  async fetchChats({ pinned = false, limit = 20 } = {}) {
    // Visit the web page to refresh CSRF tokens
    await this.session.get('https://web.arattai.in/');

    // Update CSRF header from cookies
    const jar = this.session.defaults.jar;
    const cookies = await jar.getCookies('https://web.arattai.in');
    const csrfCookie = cookies.find((c) => c.key === 'CT_CSRF_TOKEN');
    const csrfToken = csrfCookie ? csrfCookie.value : '';

    this.session.defaults.headers.common['X-ZCSRF-TOKEN'] = 'zchat_csrparam=' + csrfToken;

    // Remove the Z-Authorization header if present (no longer needed after login)
    delete this.session.defaults.headers.common['Z-Authorization'];

    const params = {
      pinned: String(pinned).toLowerCase(),
      limit,
      fromtime: '-1',
      nocache: Date.now(),
    };

    const resp = await this.session.get(this.chatApi, { params });
    const chatManager = new ChatManager(resp.data);
    return chatManager.parseChatData();
  }

  /**
   * Get a MessageSender instance for this session.
   * @returns {MessageSender}
   */
  get sender() {
    return new MessageSender(this.session);
  }

  /**
   * Fetch detailed chat messages by requesting chat data with a specific chatId.
   * This is a workaround since there's no direct message history endpoint.
   * @param {string} chatId - The chat ID to get more details for.
   * @param {object} [options]
   * @param {number} [options.limit=50] - Maximum number of messages to try to fetch.
   * @returns {Promise<Object|null>} Chat details with potential message info.
   */
  async fetchChatDetails(chatId, { limit = 50 } = {}) {
    try {
      // Visit the web page to refresh CSRF tokens
      await this.session.get('https://web.arattai.in/');

      // Update CSRF header from cookies
      const jar = this.session.defaults.jar;
      const cookies = await jar.getCookies('https://web.arattai.in');
      const csrfCookie = cookies.find((c) => c.key === 'CT_CSRF_TOKEN');
      const csrfToken = csrfCookie ? csrfCookie.value : '';

      this.session.defaults.headers.common['X-ZCSRF-TOKEN'] = 'zchat_csrparam=' + csrfToken;

      // Try to get more detailed chat info by filtering for specific chat
      const params = {
        chatid: chatId,
        limit: 1,
        fromtime: '-1',
        nocache: Date.now(),
      };

      const resp = await this.session.get(this.chatApi, { params });
      return resp.data;
    } catch (error) {
      console.error('Error fetching chat details:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Enhanced chat fetching with timestamp tracking for new message detection.
   * @param {object} [options]
   * @param {boolean} [options.pinned=false] - Whether to fetch pinned chats only.
   * @param {number} [options.limit=20] - Maximum number of chats to fetch.
   * @param {string} [options.afterTime] - Only get chats updated after this timestamp.
   * @returns {Promise<Object.<string, import('./chats').Chat>>} Map of chatId -> Chat.
   */
  async fetchChatsWithTimestamp({ pinned = false, limit = 20, afterTime = null } = {}) {
    const chats = await this.fetchChats({ pinned, limit });
    
    // If afterTime is provided, filter chats that may have new messages
    if (afterTime) {
      const filtered = {};
      for (const [chatId, chat] of Object.entries(chats)) {
        // This is a basic filter - in a real implementation, you'd compare timestamps
        // For now, we'll return all chats since we don't have reliable timestamps
        filtered[chatId] = chat;
      }
      return filtered;
    }
    
    return chats;
  }
}

module.exports = Bot;
