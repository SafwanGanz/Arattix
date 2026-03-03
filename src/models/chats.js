/**
 * Represents a single chat message.
 */
class Message {
  /**
   * @param {string} msguid - Unique message ID.
   * @param {string} msg - Message content.
   */
  constructor(msguid, msg) {
    this.msguid = msguid;
    this.msg = msg;
  }
}

/**
 * Represents a chat participant.
 */
class Participant {
  /**
   * @param {string} dname - Display name.
   * @param {string} zuid - Zone user ID.
   */
  constructor(dname, zuid) {
    this.dname = dname;
    this.zuid = zuid;
  }

  getDname() {
    return this.dname;
  }

  getZuid() {
    return this.zuid;
  }
}

/**
 * Represents a single chat with its metadata, participants, and messages.
 */
class Chat {
  /**
   * @param {string} chatId - Chat identifier.
   * @param {string} title - Chat title.
   * @param {Participant} owner - Chat owner.
   * @param {Participant[]} participants - Array of participants.
   * @param {Message|Message[]|null} message - Last message(s).
   * @param {string|null} lastmsguid - Last message UID.
   */
  constructor(chatId, title, owner, participants, message, lastmsguid) {
    this.chatId = chatId;
    this.title = title;
    this.owner = owner;
    this.participants = participants;
    this.message = message;
    this.lastmsguid = lastmsguid;
  }

  /**
   * JSON-friendly representation of the chat.
   */
  toJSON() {
    return {
      chat_id: this.chatId,
      title: this.title,
      lastmsguid: this.lastmsguid,
    };
  }

  toString() {
    return JSON.stringify(this.toJSON(), null, 2);
  }

  getChatId() {
    return this.chatId;
  }

  getTitle() {
    return this.title;
  }

  getOwner() {
    return this.owner;
  }

  getParticipants() {
    return this.participants;
  }

  getMessage(limit) {
    if (Array.isArray(this.message)) {
      return limit ? this.message.slice(-limit) : this.message;
    }
    return this.message;
  }

  getLastmsguid() {
    return this.lastmsguid;
  }

  addMessage(message) {
    if (!Array.isArray(this.message)) {
      this.message = this.message ? [this.message] : [];
    }
    this.message.push(message);
  }
}

/**
 * Parses raw chat API response data into structured Chat objects.
 */
class ChatManager {
  /**
   * @param {object} chatData - Raw API response for chats.
   */
  constructor(chatData) {
    this.chats = {};
    this.chatData = chatData;
  }

  getChats() {
    return this.chats;
  }

  /**
   * Parse the raw chat data into a map of chatId -> Chat.
   * @returns {Object.<string, Chat>} Map of chat ID to Chat instances.
   */
  parseChatData() {
    try {
      const chatList = this.chatData.data.chats;

      for (const data of chatList) {
        const allParticipants = [];

        if (data.recipants) {
          const recipants =
            typeof data.recipants === 'string'
              ? JSON.parse(data.recipants)
              : data.recipants;

          for (const participant of recipants) {
            allParticipants.push(new Participant(participant.dname, participant.zuid));
          }
        }

        let lastmsguid = null;
        let msg = null;

        if (data.lastmsginfo && data.lastmsginfo !== '') {
          const lastmsginfo =
            typeof data.lastmsginfo === 'string'
              ? JSON.parse(data.lastmsginfo)
              : data.lastmsginfo;
          lastmsguid = lastmsginfo.msguid;
          msg = new Message(lastmsginfo.msguid, lastmsginfo.msg);
        }

        const owner = new Participant(data.owner.name, data.owner.id);
        const title = data.title;
        const chatId = data.chatid;

        this.chats[chatId] = new Chat(chatId, title, owner, allParticipants, msg, lastmsguid);
      }

      return this.chats;
    } catch (err) {
      console.error('Error parsing chat data:', err);
      return this.chats;
    }
  }
}

module.exports = {
  Message,
  Participant,
  Chat,
  ChatManager,
};
