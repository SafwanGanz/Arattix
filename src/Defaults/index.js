/**
 * Default configuration constants for the Arattix library.
 * Centralizes all API URLs, service names, and default values.
 */

module.exports = {
  /** Base URL for the Arattai web app */
  WEB_BASE_URL: 'https://web.arattai.in',

  /** Accounts/auth base URL */
  ACCOUNTS_BASE_URL: 'https://accounts.arattai.in',

  /** Files server base URL (upload/download) */
  FILES_BASE_URL: 'https://files.arattai.in',

  /** V1 Chat list API */
  CHAT_API: 'https://web.arattai.in/v1/chats',

  /** V2 Messages API (returns live data) */
  MESSAGES_API: (chatId) => `https://web.arattai.in/v2/chats/${chatId}/messages`,

  /** Send text message endpoint */
  SEND_MESSAGE_URL: 'https://web.arattai.in/sendofficechatmessage.do',

  /** File upload endpoint */
  FILE_UPLOAD_URL: 'https://files.arattai.in/webupload',

  /** File download endpoint (UDS) */
  FILE_DOWNLOAD_URL: 'https://files.arattai.in/webdownload',

  /** V1 attachments fallback download */
  ATTACHMENTS_URL: (fileId) => `https://web.arattai.in/v1/attachments/${fileId}`,

  /** QR code auth endpoint */
  QR_AUTH_URL: 'https://accounts.arattai.in/signin/v2/qrcode',

  /** Download service name — must be "CLIQ" (not "arattai") */
  DOWNLOAD_SERVICE: 'CLIQ',

  /** Upload service name */
  UPLOAD_SERVICE: 'arattai',

  /** Default User-Agent string */
  DEFAULT_USER_AGENT:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',

  /** Default request timeout (ms) */
  DEFAULT_TIMEOUT: 10000,

  /** Media download/upload timeout (ms) */
  MEDIA_TIMEOUT: 30000,

  /** Default polling interval for bots (ms) */
  DEFAULT_POLL_INTERVAL: 3000,
};
