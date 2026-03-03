const { ArattixBot } = require('../');

/**
 * A class-based command bot for Arattix.
 * Uses v1 chat polling (slower, cached) — see simple-bot.js for v2 approach.
 *
 * Usage:
 *   node Example/command-bot.js
 */
class ArattixCommandBot {
  constructor() {
    this.bot = null;
    this.lastChatStates = new Map();
    this.isRunning = false;
    this.pollInterval = 2000;
  }

  async start() {
    console.log('🤖 Starting Arattix Command Bot...');

    try {
      const arattix = new ArattixBot({ isShowQr: true });
      this.bot = await arattix.loginWithQr();
      console.log('✅ Bot authenticated successfully!');

      await this.initializeChatStates();
      this.startPolling();
      console.log('👂 Message monitoring started. Send /help in any chat to test!');
    } catch (error) {
      console.error('❌ Failed to start bot:', error);
    }
  }

  async initializeChatStates() {
    console.log('🔄 Initializing chat states...');
    try {
      const chats = await this.bot.fetchChats({ limit: 100 });
      for (const [chatId, chat] of Object.entries(chats)) {
        if (chat.message && chat.message.msguid) {
          this.lastChatStates.set(chatId, chat.message.msguid);
        }
      }
      console.log(`📊 Initialized ${this.lastChatStates.size} chat states`);
    } catch (error) {
      console.error('❌ Error initializing chat states:', error);
    }
  }

  startPolling() {
    this.isRunning = true;
    const poll = async () => {
      if (!this.isRunning) return;
      try {
        await this.checkForNewMessages();
      } catch (error) {
        console.error('❌ Polling error:', error.message);
      }
      setTimeout(poll, this.pollInterval);
    };
    poll();
  }

  async checkForNewMessages() {
    try {
      const chats = await this.bot.fetchChats({ limit: 100 });
      for (const [chatId, chat] of Object.entries(chats)) {
        await this.processChatForNewMessages(chatId, chat);
      }
    } catch (error) {
      console.error('❌ Error checking messages:', error);
    }
  }

  async processChatForNewMessages(chatId, chat) {
    try {
      if (!chat.message || !chat.message.msguid || !chat.message.msg) return;

      const currentMessageUID = chat.message.msguid;
      const messageText = chat.message.msg.trim();
      const lastKnownUID = this.lastChatStates.get(chatId);
      const isNewMessage = !lastKnownUID || currentMessageUID !== lastKnownUID;

      if (isNewMessage) {
        console.log(`📨 New message detected in "${chat.title}": "${messageText}"`);
        this.lastChatStates.set(chatId, currentMessageUID);

        if (this.isSystemMessage(messageText)) {
          console.log('⏩ Skipping system message');
          return;
        }

        if (messageText.startsWith('/')) {
          console.log(`🎯 Processing command: ${messageText}`);
          await this.handleCommand(messageText, chat);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing chat ${chatId}:`, error);
    }
  }

  isSystemMessage(messageText) {
    const systemPatterns = [
      /^\d+$/,
      /%20/,
      /^[0-9]+%[0-9]+/,
      /joined|left|added|removed/i,
      /^$/,
    ];
    return systemPatterns.some(pattern => pattern.test(messageText));
  }

  async handleCommand(messageText, chat) {
    const command = messageText.toLowerCase().trim();
    try {
      console.log(`🔧 Executing command: ${command} in chat: ${chat.title}`);

      switch (command) {
        case '/ping':
          await this.bot.sender.sendMessage('🏓 Pong! Bot is working correctly.', { chat });
          break;
        case '/help':
          await this.bot.sender.sendMessage(
            `🤖 **Arattix Bot Commands**\n\n` +
            `• /ping - Test bot connectivity\n` +
            `• /help - Show this help\n` +
            `• /time - Get current server time\n` +
            `• /info - Show chat information\n` +
            `• /status - Show bot status`,
            { chat }
          );
          break;
        case '/time':
          const now = new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'full', timeStyle: 'medium' });
          await this.bot.sender.sendMessage(`⏰ **Current Time**\n${now} UTC`, { chat });
          break;
        case '/info':
          const participantCount = chat.participants ? chat.participants.length : 0;
          await this.bot.sender.sendMessage(
            `📋 **Chat Information**\n\n` +
            `• **Title:** ${chat.title}\n` +
            `• **Participants:** ${participantCount}\n` +
            `• **Owner:** ${chat.owner?.dname || 'Unknown'}`,
            { chat }
          );
          break;
        case '/status':
          await this.bot.sender.sendMessage(
            `📊 **Bot Status**\n\n` +
            `• **Status:** ✅ Active\n` +
            `• **Tracked Chats:** ${this.lastChatStates.size}\n` +
            `• **Poll Interval:** ${this.pollInterval / 1000}s\n` +
            `• **Uptime:** ${process.uptime().toFixed(0)}s`,
            { chat }
          );
          break;
        default:
          await this.bot.sender.sendMessage(
            `❓ Unknown command "${messageText}". Type /help for available commands.`,
            { chat }
          );
      }
    } catch (error) {
      console.error('❌ Error executing command:', error);
      try {
        await this.bot.sender.sendMessage('❌ Error processing command. Please try again.', { chat });
      } catch (sendError) {
        console.error('❌ Failed to send error message:', sendError);
      }
    }
  }

  stop() {
    console.log('🛑 Stopping bot...');
    this.isRunning = false;
  }
}

process.on('SIGINT', () => {
  console.log('\n👋 Received SIGINT, shutting down...');
  process.exit(0);
});

if (require.main === module) {
  const bot = new ArattixCommandBot();
  bot.start().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = ArattixCommandBot;
