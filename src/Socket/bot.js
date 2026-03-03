const { ChatManager } = require('../Types');
const MessageSender = require('./messages');
const Defaults = require('../Defaults');
const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const fs = require('fs');

/**
 * Authenticated bot instance that can fetch chats, send messages/files,
 * and download/upload media.
 */
class Bot {
  /**
   * @param {import('axios').AxiosInstance} session - Authenticated axios instance with cookie jar.
   */
  constructor(session) {
    this.session = session;
    this.chats = [];
  }

  // ─── CSRF ──────────────────────────────────────────────────────────

  /**
   * Ensure CSRF token is set up on the session.
   * Call this once after login before using other API methods.
   */
  async setupCsrf() {
    await this.session.get(Defaults.WEB_BASE_URL + '/');
    const jar = this.session.defaults.jar;
    const cookies = await jar.getCookies(Defaults.WEB_BASE_URL);
    const csrfCookie = cookies.find((c) => c.key === 'CT_CSRF_TOKEN');
    const csrfToken = csrfCookie ? csrfCookie.value : '';
    this.session.defaults.headers.common['X-ZCSRF-TOKEN'] = 'zchat_csrparam=' + csrfToken;
    delete this.session.defaults.headers.common['Z-Authorization'];
  }

  // ─── MESSAGE SENDER ────────────────────────────────────────────────

  /**
   * Get a MessageSender instance for this session.
   * @returns {MessageSender}
   */
  get sender() {
    return new MessageSender(this.session);
  }

  // ─── CHATS ─────────────────────────────────────────────────────────

  /**
   * Fetch chat list from the server.
   * @param {object} [options]
   * @param {boolean} [options.pinned=false] - Fetch pinned chats only.
   * @param {number} [options.limit=20] - Max number of chats.
   * @returns {Promise<Object.<string, import('../Types/Chat').Chat>>} Map of chatId -> Chat.
   */
  async fetchChats({ pinned = false, limit = 20 } = {}) {
    await this._refreshCsrf();

    const params = {
      pinned: String(pinned).toLowerCase(),
      limit,
      fromtime: '-1',
      nocache: Date.now(),
    };

    const resp = await this.session.get(Defaults.CHAT_API, { params });
    const chatManager = new ChatManager(resp.data);
    return chatManager.parseChatData();
  }

  /**
   * Fetch RAW chat API response without parsing.
   * @param {object} [options]
   * @param {number} [options.limit=20]
   * @returns {Promise<Object>} Raw API response.
   */
  async fetchChatsRaw({ limit = 20 } = {}) {
    await this._refreshCsrf();

    const params = {
      pinned: 'false',
      limit,
      fromtime: '-1',
      nocache: Date.now(),
    };

    const resp = await this.session.get(Defaults.CHAT_API, { params });
    return resp.data;
  }

  /**
   * Fetch chats with a FRESH session to bypass server-side session caching.
   * @param {object} [options]
   * @param {number} [options.limit=20]
   * @returns {Promise<Object.<string, import('../Types/Chat').Chat>>}
   */
  async fetchChatsLive({ limit = 20 } = {}) {
    const freshSession = await this._createFreshSession();

    const params = {
      pinned: 'false',
      limit,
      fromtime: '-1',
      nocache: Date.now(),
    };

    const resp = await freshSession.get(Defaults.CHAT_API, { params });
    const chatManager = new ChatManager(resp.data);
    return chatManager.parseChatData();
  }

  /**
   * Fetch chats with a FRESH session, returning raw data.
   * @param {object} [options]
   * @param {number} [options.limit=20]
   * @returns {Promise<Object>}
   */
  async fetchChatsLiveRaw({ limit = 20 } = {}) {
    const freshSession = await this._createFreshSession();

    const params = {
      pinned: 'false',
      limit,
      fromtime: '-1',
      nocache: Date.now(),
    };

    const resp = await freshSession.get(Defaults.CHAT_API, { params });
    return resp.data;
  }

  /**
   * Fetch detailed chat info for a specific chat.
   * @param {string} chatId - The chat ID.
   * @param {object} [options]
   * @param {number} [options.limit=50]
   * @returns {Promise<Object|null>}
   */
  async fetchChatDetails(chatId, { limit = 50 } = {}) {
    try {
      await this._refreshCsrf();

      const params = {
        chatid: chatId,
        limit: 1,
        fromtime: '-1',
        nocache: Date.now(),
      };

      const resp = await this.session.get(Defaults.CHAT_API, { params });
      return resp.data;
    } catch (error) {
      console.error('Error fetching chat details:', error.response?.data || error.message);
      return null;
    }
  }

  // ─── MESSAGES ──────────────────────────────────────────────────────

  /**
   * Fetch messages for a specific chat using the V2 API.
   * Returns LIVE, uncached data — unlike v1/chats.
   * @param {string} chatId - The chat ID.
   * @param {object} [options]
   * @param {number} [options.limit=20] - Max number of messages.
   * @returns {Promise<Array>} Array of message objects sorted oldest-first.
   */
  async fetchMessages(chatId, { limit = 20 } = {}) {
    const resp = await this.session.get(Defaults.MESSAGES_API(chatId), {
      params: { limit, nocache: Date.now() },
      timeout: Defaults.DEFAULT_TIMEOUT,
    });
    return resp.data?.data || [];
  }

  // ─── MEDIA ─────────────────────────────────────────────────────────

  /**
   * Download a media file (image, audio, video, document) from a message.
   * @param {string} fileId - The file ID from message.content.file.id.
   * @param {string} chatId - The chat ID the file belongs to.
   * @param {object} [options]
   * @param {boolean} [options.thumbnail=false] - Download thumbnail instead.
   * @returns {Promise<{data: Buffer, contentType: string, fileName: string|null}>}
   */
  async downloadMedia(fileId, chatId, { thumbnail = false } = {}) {
    const cliMsg = { chat_id: chatId };
    if (thumbnail) cliMsg.thumbnail = true;

    // Primary: UDS download from files server
    try {
      const resp = await this.session.get(Defaults.FILE_DOWNLOAD_URL, {
        params: {
          'x-service': Defaults.DOWNLOAD_SERVICE,
          'event-id': fileId,
          'x-cli-msg': JSON.stringify(cliMsg),
        },
        responseType: 'arraybuffer',
        timeout: Defaults.MEDIA_TIMEOUT,
      });
      return this._parseMediaResponse(resp);
    } catch (err) {
      // Fallback: v1 attachments endpoint
      const resp = await this.session.get(Defaults.ATTACHMENTS_URL(fileId), {
        params: { chat_id: chatId },
        responseType: 'arraybuffer',
        timeout: Defaults.MEDIA_TIMEOUT,
      });
      return this._parseMediaResponse(resp);
    }
  }

  /**
   * Download media and save to a file.
   * @param {string} fileId - The file ID.
   * @param {string} chatId - The chat ID.
   * @param {string} outputPath - Path to save the file.
   * @param {object} [options]
   * @param {boolean} [options.thumbnail=false]
   * @returns {Promise<{path: string, contentType: string, size: number}>}
   */
  async downloadMediaToFile(fileId, chatId, outputPath, { thumbnail = false } = {}) {
    const { data, contentType } = await this.downloadMedia(fileId, chatId, { thumbnail });
    fs.writeFileSync(outputPath, data);
    return { path: outputPath, contentType, size: data.length };
  }

  /**
   * Get the download URL for a media file without downloading it.
   * @param {string} fileId - The file ID.
   * @param {string} chatId - The chat ID.
   * @param {object} [options]
   * @param {boolean} [options.thumbnail=false]
   * @returns {string}
   */
  getMediaUrl(fileId, chatId, { thumbnail = false } = {}) {
    const cliMsg = { chat_id: chatId };
    if (thumbnail) cliMsg.thumbnail = true;
    return (
      Defaults.FILE_DOWNLOAD_URL +
      '?x-service=' + Defaults.DOWNLOAD_SERVICE +
      '&event-id=' + encodeURIComponent(fileId) +
      '&x-cli-msg=' + encodeURIComponent(JSON.stringify(cliMsg))
    );
  }

  // ─── STATIC HELPERS ────────────────────────────────────────────────

  /**
   * Check if a v2 message contains media.
   * @param {object} msg - A v2 message object.
   * @returns {boolean}
   */
  static isMediaMessage(msg) {
    return msg?.type === 'file' && msg?.content?.file != null;
  }

  /**
   * Extract media info from a v2 message.
   * @param {object} msg - A v2 message object with type 'file'.
   * @returns {{ fileId: string, fileName: string, mimeType: string, size: number, isImage: boolean, isAudio: boolean, isVideo: boolean, isDocument: boolean, thumbnail: object|null, dimensions: object|null }|null}
   */
  static getMediaInfo(msg) {
    if (!Bot.isMediaMessage(msg)) return null;
    const file = msg.content.file;
    const mimeType = file.type || 'application/octet-stream';
    return {
      fileId: file.id,
      fileName: file.name,
      mimeType,
      size: file.dimensions?.size || 0,
      isImage: mimeType.startsWith('image/'),
      isAudio: mimeType.startsWith('audio/'),
      isVideo: mimeType.startsWith('video/'),
      isDocument: !mimeType.startsWith('image/') && !mimeType.startsWith('audio/') && !mimeType.startsWith('video/'),
      thumbnail: msg.content.thumbnail && Object.keys(msg.content.thumbnail).length > 0 ? msg.content.thumbnail : null,
      dimensions: file.dimensions || null,
    };
  }

  // ─── PRIVATE ───────────────────────────────────────────────────────

  /** @private */
  async _refreshCsrf() {
    await this.session.get(Defaults.WEB_BASE_URL + '/');
    const jar = this.session.defaults.jar;
    const cookies = await jar.getCookies(Defaults.WEB_BASE_URL);
    const csrfCookie = cookies.find((c) => c.key === 'CT_CSRF_TOKEN');
    const csrfToken = csrfCookie ? csrfCookie.value : '';
    this.session.defaults.headers.common['X-ZCSRF-TOKEN'] = 'zchat_csrparam=' + csrfToken;
    delete this.session.defaults.headers.common['Z-Authorization'];
  }

  /** @private */
  async _createFreshSession() {
    const freshJar = new CookieJar();

    const domains = ['arattai.in', 'web.arattai.in', 'accounts.arattai.in'];
    for (const domain of domains) {
      try {
        const cookies = await this.session.defaults.jar.getCookies(`https://${domain}/`);
        for (const cookie of cookies) {
          if (cookie.key === 'JSESSIONID' && domain === 'web.arattai.in') continue;
          try { await freshJar.setCookie(cookie, `https://${domain}/`); } catch (e) {}
        }
      } catch (e) {}
    }

    const freshSession = wrapper(axios.create({
      jar: freshJar,
      withCredentials: true,
      headers: {
        common: {
          'User-Agent': this.session.defaults.headers.common['User-Agent'] || Defaults.DEFAULT_USER_AGENT,
        },
      },
    }));

    await freshSession.get(Defaults.WEB_BASE_URL + '/');

    const freshCookies = await freshJar.getCookies(Defaults.WEB_BASE_URL);
    const csrfCookie = freshCookies.find((c) => c.key === 'CT_CSRF_TOKEN');
    const csrfToken = csrfCookie ? csrfCookie.value : '';
    freshSession.defaults.headers.common['X-ZCSRF-TOKEN'] = 'zchat_csrparam=' + csrfToken;

    return freshSession;
  }

  /** @private */
  _parseMediaResponse(resp) {
    const contentType = resp.headers['content-type'] || 'application/octet-stream';
    const disposition = resp.headers['content-disposition'] || '';
    const fileNameMatch = disposition.match(/filename[*]?=["']?([^"';\n]+)/);
    return {
      data: Buffer.from(resp.data),
      contentType,
      fileName: fileNameMatch ? fileNameMatch[1] : null,
    };
  }
}

module.exports = Bot;
