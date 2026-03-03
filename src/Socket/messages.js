const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const Defaults = require('../Defaults');

/**
 * Sends text messages and files to Arattai chats.
 */
class MessageSender {
  /**
   * @param {import('axios').AxiosInstance} session - Authenticated axios instance.
   */
  constructor(session) {
    this.session = session;
  }

  /**
   * Send a text message to a chat.
   * @param {string} message - Message text.
   * @param {object} options - Either { chatId, dname } or { chat: Chat }.
   * @param {string} [options.chatId] - Chat ID to send to.
   * @param {string} [options.dname] - Display name.
   * @param {import('../Types/Chat').Chat} [options.chat] - Chat object (overrides chatId/dname).
   * @returns {Promise<object>} Axios response data.
   */
  async sendMessage(message, { chatId, dname, chat } = {}) {
    if (!chatId && !chat) {
      throw new Error('Please pass either chatId or a Chat object');
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

    const resp = await this.session.post(Defaults.SEND_MESSAGE_URL, data.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return resp.data;
  }

  /**
   * Send a file to a chat.
   * @param {string} filePath - Absolute or relative path to the file.
   * @param {string} [caption=''] - Caption for the file.
   * @param {object} options - Either { chatId, dname } or { chat: Chat }.
   * @returns {Promise<object>} Axios response data.
   */
  async sendFile(filePath, caption = '', { chatId, dname, chat } = {}) {
    if (!chatId && !chat) {
      throw new Error('Please pass either chatId or a Chat object');
    }

    if (chat) {
      chatId = chat.getChatId();
      dname = chat.owner.getDname();
    }

    const mimeType = mime.lookup(filePath) || 'application/octet-stream';
    const fileName = path.basename(filePath);
    const fileBuffer = fs.readFileSync(filePath);

    return this._uploadBuffer(fileBuffer, fileName, mimeType, caption, chatId);
  }

  /**
   * Send a Buffer as a file to a chat.
   * Useful for forwarding downloaded media or generating files in memory.
   * @param {Buffer} buffer - The file data.
   * @param {string} fileName - Display name for the file (e.g. 'photo.jpg').
   * @param {object} options - { chatId, mimeType?, caption?, chat? }.
   * @returns {Promise<object>} Axios response data.
   */
  async sendBuffer(buffer, fileName, { chatId, dname, chat, mimeType, caption = '' } = {}) {
    if (!chatId && !chat) {
      throw new Error('Please pass either chatId or a Chat object');
    }

    if (chat) {
      chatId = chat.getChatId();
      dname = chat.owner.getDname();
    }

    const resolvedMime = mimeType || mime.lookup(fileName) || 'application/octet-stream';
    return this._uploadBuffer(buffer, fileName, resolvedMime, caption, chatId);
  }

  /**
   * Send an image file to a chat.
   * @param {string} filePath - Path to the image file.
   * @param {string} [caption=''] - Caption.
   * @param {object} opts - { chatId, dname } or { chat }.
   * @returns {Promise<object>}
   */
  async sendImage(filePath, caption = '', opts = {}) {
    return this.sendFile(filePath, caption, opts);
  }

  /**
   * Send an audio file to a chat.
   * @param {string} filePath - Path to the audio file.
   * @param {string} [caption=''] - Caption.
   * @param {object} opts - { chatId, dname } or { chat }.
   * @returns {Promise<object>}
   */
  async sendAudio(filePath, caption = '', opts = {}) {
    return this.sendFile(filePath, caption, opts);
  }

  /**
   * Send a video file to a chat.
   * @param {string} filePath - Path to the video file.
   * @param {string} [caption=''] - Caption.
   * @param {object} opts - { chatId, dname } or { chat }.
   * @returns {Promise<object>}
   */
  async sendVideo(filePath, caption = '', opts = {}) {
    return this.sendFile(filePath, caption, opts);
  }

  /**
   * Send a document to a chat.
   * @param {string} filePath - Path to the document.
   * @param {string} [caption=''] - Caption.
   * @param {object} opts - { chatId, dname } or { chat }.
   * @returns {Promise<object>}
   */
  async sendDocument(filePath, caption = '', opts = {}) {
    return this.sendFile(filePath, caption, opts);
  }

  /**
   * Internal: upload a buffer to the file server.
   * @private
   */
  async _uploadBuffer(buffer, fileName, mimeType, caption, chatId) {
    const timestamp = Date.now();
    const headers = {
      'x-cliq-content-type': mimeType,
      'x-cliq-comment': caption || '',
      'upload-id': chatId + '_' + timestamp,
      'x-cliq-msgid': String(timestamp),
      'file-name': fileName,
      'Content-Type': mimeType,
      'x-service': Defaults.UPLOAD_SERVICE,
      'x-cliq-sid': 'a',
      'x-client-time-utc': String(timestamp),
      'x-cliq-id': chatId,
    };

    const resp = await this.session.post(Defaults.FILE_UPLOAD_URL, buffer, { headers });
    return resp.data;
  }
}

module.exports = MessageSender;
