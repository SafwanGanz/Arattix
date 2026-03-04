const { ArattixBot } = require('./');

/**
 * Docker Example Bot
 * 
 * A containerized Arattix bot that demonstrates:
 * - Environment variable configuration
 * - Session persistence via volume mount
 * - Graceful shutdown handling
 * - Basic command handling
 */

// Configuration from environment variables
const config = {
  isShowQr: process.env.SHOW_QR !== 'false',
  pollInterval: parseInt(process.env.POLL_INTERVAL || '3000'),
  botName: process.env.BOT_NAME || 'Docker Bot',
  logLevel: process.env.LOG_LEVEL || 'info'
};

// Global state
let bot = null;
const lastSeen = {};

// Logging utility
const log = {
  info: (msg) => config.logLevel !== 'silent' && console.log(`ℹ️ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  success: (msg) => config.logLevel !== 'silent' && console.log(`✅ ${msg}`),
  debug: (msg) => config.logLevel === 'debug' && console.log(`🐛 ${msg}`)
};

// Command handlers
const commands = {
  ping: async (msg, chatId) => {
    await bot.sender.sendMessage('🏓 Pong! Bot is running in Docker.', {
      chatId,
      dname: config.botName
    });
  },

  status: async (msg, chatId) => {
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    
    await bot.sender.sendMessage(
      `🐳 Docker Bot Status\n` +
      `Uptime: ${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s\n` +
      `Memory: ${Math.round(memory.rss / 1024 / 1024)}MB\n` +
      `Environment: ${process.env.NODE_ENV || 'development'}`,
      { chatId, dname: config.botName }
    );
  },

  help: async (msg, chatId) => {
    await bot.sender.sendMessage(
      `🤖 Available Commands:\n` +
      `/ping - Test bot response\n` +
      `/status - Show bot status\n` +
      `/help - Show this message\n` +
      `/echo <text> - Echo your message`,
      { chatId, dname: config.botName }
    );
  },

  echo: async (msg, chatId) => {
    const text = msg.content?.text?.slice(6).trim();
    if (text) {
      await bot.sender.sendMessage(`🔊 ${text}`, {
        chatId, dname: config.botName
      });
    }
  }
};

// Message processor
async function processMessage(msg, chatId) {
  const text = msg.content?.text;
  if (!text || !text.startsWith('/')) return;

  const command = text.slice(1).split(' ')[0].toLowerCase();
  
  if (commands[command]) {
    try {
      log.debug(`Executing command: ${command} in chat ${chatId}`);
      await commands[command](msg, chatId);
    } catch (error) {
      log.error(`Command ${command} failed: ${error.message}`);
    }
  }
}

// Main polling function
async function pollMessages() {
  const chatData = await bot.fetchChatsRaw({ limit: 30 });
  const chatList = chatData.data?.chats || [];

  for (const chat of chatList) {
    try {
      const messages = await bot.fetchMessages(chat.chatid, { limit: 5 });
      
      for (const msg of messages) {
        // Skip already seen messages
        if (lastSeen[chat.chatid] && msg.id <= lastSeen[chat.chatid]) continue;
        
        // Process new message
        await processMessage(msg, chat.chatid);
        
        // Handle media messages
        if (require('./src/Socket/bot').isMediaMessage(msg)) {
          const info = require('./src/Socket/bot').getMediaInfo(msg);
          log.info(`📁 Media received in ${chat.title}: ${info.fileName}`);
        }
      }
      
      // Update last seen
      if (messages.length > 0) {
        lastSeen[chat.chatid] = messages[messages.length - 1].id;
      }
    } catch (error) {
      log.debug(`Error polling chat ${chat.chatid}: ${error.message}`);
    }
  }
}

// Graceful shutdown handler
function gracefulShutdown() {
  log.info('Received shutdown signal, cleaning up...');
  process.exit(0);
}

// Main function
async function main() {
  log.info('🐳 Starting Arattix Docker Bot...');
  log.info(`Configuration: ${JSON.stringify(config, null, 2)}`);

  try {
    // Initialize bot
    const arattix = new ArattixBot({ 
      isShowQr: config.isShowQr,
      proxy: process.env.HTTP_PROXY || null
    });
    
    bot = await arattix.loginWithQr();
    await bot.setupCsrf();
    
    log.success('Bot authenticated successfully');
    
    // Get initial chat state
    const chatData = await bot.fetchChatsRaw({ limit: 30 });
    const chatList = chatData.data?.chats || [];
    
    log.info(`📋 Monitoring ${chatList.length} chats`);
    
    // Initialize last seen messages
    for (const chat of chatList) {
      try {
        const messages = await bot.fetchMessages(chat.chatid, { limit: 1 });
        if (messages.length > 0) {
          lastSeen[chat.chatid] = messages[messages.length - 1].id;
        }
      } catch (error) {
        log.debug(`Failed to initialize chat ${chat.chatid}: ${error.message}`);
      }
    }
    
    log.success('🚀 Bot is now running and listening for messages...');
    
    // Send startup message to first chat (optional)
    if (chatList.length > 0 && process.env.SEND_STARTUP_MESSAGE === 'true') {
      await bot.sender.sendMessage(
        `🐳 ${config.botName} is now online!\nType /help for available commands.`,
        { chatId: chatList[0].chatid, dname: config.botName }
      );
    }
    
    // Start polling loop
    setInterval(pollMessages, config.pollInterval);
    
  } catch (error) {
    log.error(`Failed to start bot: ${error.message}`);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Start the bot
main().catch(error => {
  log.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});