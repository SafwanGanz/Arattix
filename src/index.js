const ArattixBot = require('./Socket');
const Bot = require('./Socket/bot');
const MessageSender = require('./Socket/messages');
const { Chat, ChatManager, Message, MediaInfo, Participant } = require('./Types');
const { QRLogin, SessionManager, TokenLogin } = require('./Auth');
const Defaults = require('./Defaults');

module.exports = {
  // Core
  ArattixBot,
  Bot,
  MessageSender,

  // Types
  Chat,
  ChatManager,
  Message,
  MediaInfo,
  Participant,

  // Auth
  QRLogin,
  SessionManager,
  TokenLogin,

  // Config
  Defaults,
};
