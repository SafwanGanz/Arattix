const { ArattixBot, Bot } = require('../');
const fs = require('fs');
const path = require('path');

/**
 * Simple Arattix Command Bot
 *
 * Uses /v2/chats/{chatId}/messages for LIVE message detection (zero delay).
 * Polls all chats every 3 seconds for new messages.
 * Supports text commands + media detection/download/send.
 *
 * Usage:
 *   node Example/simple-bot.js
 */

const POLL_INTERVAL = 3000;
const PREFIX = '/';
const DOWNLOAD_DIR = path.join(__dirname, '..', 'downloads');

if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

const lastSeen = {};

const commands = {
  ping: async (msg, bot, chatId) => {
    await bot.sender.sendMessage('🏓 Pong!', { chatId, dname: 'Arattix Bot' });
  },
  help: async (msg, bot, chatId) => {
    await bot.sender.sendMessage(
      '📋 *Available Commands*\n' +
      '/ping - Check if bot is alive\n' +
      '/help - Show this help\n' +
      '/echo <text> - Echo back your text\n' +
      '/info - Show chat info\n' +
      '\n📎 Send any image/audio/video/file and the bot will detect it!',
      { chatId, dname: 'Arattix Bot' }
    );
  },
  echo: async (msg, bot, chatId) => {
    const text = msg.content?.text?.slice(6).trim();
    if (text) {
      await bot.sender.sendMessage(`🔊 ${text}`, { chatId, dname: 'Arattix Bot' });
    } else {
      await bot.sender.sendMessage('Usage: /echo <text>', { chatId, dname: 'Arattix Bot' });
    }
  },
  info: async (msg, bot, chatId, chatTitle) => {
    await bot.sender.sendMessage(
      `ℹ️ Chat: ${chatTitle}\nID: ${chatId}\nYour name: ${msg.sender?.name}\nYour ID: ${msg.sender?.id}`,
      { chatId, dname: 'Arattix Bot' }
    );
  },
};

async function main() {
  console.log('🤖 Arattix Bot starting...\n');

  const arattix = new ArattixBot({ isShowQr: true });
  const bot = await arattix.loginWithQr();
  console.log('✅ Logged in!\n');

  await bot.setupCsrf();

  const chatData = await bot.fetchChatsRaw({ limit: 30 });
  const chatList = chatData.data?.chats || [];
  console.log(`📋 Monitoring ${chatList.length} chats:`);
  for (const chat of chatList) {
    console.log(`  - ${chat.title} (${chat.chatid})`);
  }

  console.log('\n⏳ Initializing message tracking...');
  for (const chat of chatList) {
    try {
      const msgs = await bot.fetchMessages(chat.chatid, { limit: 1 });
      if (msgs.length > 0) {
        lastSeen[chat.chatid] = msgs[msgs.length - 1].id;
      }
    } catch (err) {
      console.log(`  ⚠️ Could not init ${chat.title}: ${err.message}`);
    }
  }
  console.log('✅ Tracking initialized.\n');
  console.log('🟢 Bot is ONLINE. Listening for commands...\n');

  async function poll() {
    for (const chat of chatList) {
      try {
        const msgs = await bot.fetchMessages(chat.chatid, { limit: 5 });
        if (!msgs.length) continue;

        const lastId = lastSeen[chat.chatid];
        let newMsgs;
        if (!lastId) {
          lastSeen[chat.chatid] = msgs[msgs.length - 1].id;
          continue;
        }

        const lastIdx = msgs.findIndex(m => m.id === lastId);
        if (lastIdx === -1) {
          newMsgs = msgs;
        } else {
          newMsgs = msgs.slice(lastIdx + 1);
        }

        if (newMsgs.length === 0) continue;
        lastSeen[chat.chatid] = newMsgs[newMsgs.length - 1].id;

        for (const msg of newMsgs) {
          // Handle media messages
          if (Bot.isMediaMessage(msg)) {
            const media = Bot.getMediaInfo(msg);
            const typeIcon = media.isImage ? '🖼️' : media.isAudio ? '🎵' : media.isVideo ? '🎬' : '📄';
            console.log(`${typeIcon} [${chat.title}] ${msg.sender?.name} sent ${media.fileName} (${media.mimeType}, ${(media.size / 1024).toFixed(1)}KB)`);

            try {
              await bot.sender.sendMessage(
                `${typeIcon} Received: *${media.fileName}*\nType: ${media.mimeType}\nSize: ${(media.size / 1024).toFixed(1)} KB`,
                { chatId: chat.chatid, dname: 'Arattix Bot' }
              );
            } catch (err) {
              console.error(`  ❌ Media ack error: ${err.message}`);
            }
            continue;
          }

          if (msg.type !== 'text') continue;
          const text = msg.content?.text || '';
          console.log(`💬 [${chat.title}] ${msg.sender?.name}: ${text}`);

          if (text.startsWith(PREFIX)) {
            const cmdName = text.slice(PREFIX.length).split(/\s/)[0].toLowerCase();
            const handler = commands[cmdName];
            if (handler) {
              console.log(`  ⚡ Executing /${cmdName}`);
              try {
                await handler(msg, bot, chat.chatid, chat.title);
              } catch (err) {
                console.error(`  ❌ Command error: ${err.message}`);
              }
            }
          }
        }
      } catch (err) {
        // Silently skip
      }
    }

    setTimeout(poll, POLL_INTERVAL);
  }

  poll();

  process.stdin.resume();
  process.on('SIGINT', () => {
    console.log('\n👋 Bot shutting down...');
    process.exit(0);
  });
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
