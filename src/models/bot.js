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
}

module.exports = Bot;
