const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const { Chat } = require('./chats');

/**
 * Sends text messages and files to Arattai chats.
 */
class MessageSender {
  /**
   * @param {import('axios').AxiosInstance} session - Authenticated axios instance.
   */
  constructor(session) {
    this.session = session;
    this.mSendUrl = 'https://web.arattai.in/sendofficechatmessage.do';
    this.fSendUrl = 'https://files.arattai.in/webupload';
  }

  /**
   * Send a text message to a chat.
   * @param {string} message - Message text.
   * @param {object} options - Either { chatId, dname } or { chat: Chat }.
   * @param {string} [options.chatId] - Chat ID to send to.
   * @param {string} [options.dname] - Display name.
   * @param {Chat} [options.chat] - Chat object (overrides chatId/dname).
   * @returns {Promise<object>} Axios response data.
   */
  async sendMessage(message, { chatId, dname, chat } = {}) {
    if (!chatId && !chat) {
      console.log('Please pass either chatId or a Chat object');
      return false;
    }

    if (chat) {
      chatId = chat.getChatId();
      dname = chat.owner.getDname();
    }

    const data = new URLSearchParams({
      chid: chatId,
      msg: message,
      msgid: String(Date.now()),
      dname: dname || '',
      unfurl: 'true',
    });

    const resp = await this.session.post(this.mSendUrl, data.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return resp.data;
  }

  /**
   * Send a file to a chat.
   * @param {string} filePath - Absolute or relative path to the file.
   * @param {string} [caption=''] - Caption for the file.
   * @param {object} options - Either { chatId, dname } or { chat: Chat }.
   * @param {string} [options.chatId] - Chat ID to send to.
   * @param {string} [options.dname] - Display name.
   * @param {Chat} [options.chat] - Chat object (overrides chatId/dname).
   * @returns {Promise<object>} Axios response data.
   */
  async sendFile(filePath, caption = '', { chatId, dname, chat } = {}) {
    if (!chatId && !chat) {
      console.log('Please pass either chatId or a Chat object');
      return false;
    }

    if (chat) {
      chatId = chat.getChatId();
      dname = chat.owner.getDname();
    }

    const timestamp = Date.now();
    const mimeType = mime.lookup(filePath) || 'application/octet-stream';
    const fileName = path.basename(filePath);
    const fileBuffer = fs.readFileSync(filePath);

    const headers = {
      'x-cliq-content-type': mimeType,
      'x-cliq-comment': caption,
      'upload-id': chatId + '_' + timestamp,
      'x-cliq-msgid': String(timestamp),
      'file-name': fileName,
      'Content-Type': mimeType,
      'x-service': 'arattai',
      'x-cliq-sid': 'a',
      'x-client-time-utc': String(timestamp),
      'x-cliq-id': chatId,
    };

    const resp = await this.session.post(this.fSendUrl, fileBuffer, { headers });
    return resp.data;
  }
}

module.exports = MessageSender;
