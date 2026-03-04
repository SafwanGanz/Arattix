<div align="center">
  <img src="https://e.top4top.io/p_3714329231.png" alt="Arattix" width="120" height="120">
  <h1>Arattix</h1>
</div>

Node.js library for the **Arattai** messaging API — send messages, media, and build bots.

## Installation

```bash
npm install arattix
```

## Quick Start

```js
const { ArattixBot } = require('arattix');

(async () => {
  const arattix = new ArattixBot({ isShowQr: true });
  const bot = await arattix.loginWithQr();

  // Fetch chats
  const chats = await bot.fetchChats({ limit: 20 });
  const chatId = Object.keys(chats)[0];

  // Send a text message
  await bot.sender.sendMessage('Hello from Arattix!', { chat: chats[chatId] });

  // Send a file
  await bot.sender.sendFile('photo.jpg', 'My caption', { chat: chats[chatId] });
})();
```

## Examples

Run the simple polling bot:

```bash
node Example/simple-bot.js
```

Or the class-based command bot:

```bash
node Example/command-bot.js
```

## API Reference

### `ArattixBot`

```js
const arattix = new ArattixBot({ isShowQr: true, proxy: null });
const bot = await arattix.loginWithQr();
```

### `Bot`

#### Chats

```js
const chats = await bot.fetchChats({ limit: 20 });
const raw = await bot.fetchChatsRaw({ limit: 20 });
const live = await bot.fetchChatsLive({ limit: 20 });
```

#### Messages (v2 — live, uncached)

```js
const messages = await bot.fetchMessages(chatId, { limit: 20 });
```

#### Media Download

```js
// Download to buffer
const { data, contentType, fileName } = await bot.downloadMedia(fileId, chatId);

// Download to file
await bot.downloadMediaToFile(fileId, chatId, './photo.jpg');

// Get download URL
const url = bot.getMediaUrl(fileId, chatId);

// Download thumbnail
const thumb = await bot.downloadMedia(fileId, chatId, { thumbnail: true });
```

#### Media Detection

```js
if (Bot.isMediaMessage(msg)) {
  const info = Bot.getMediaInfo(msg);
  console.log(info.fileName, info.mimeType, info.size);
  console.log(info.isImage, info.isAudio, info.isVideo);
}
```

### `MessageSender`

```js
await bot.sender.sendMessage('Hello!', { chatId });
await bot.sender.sendFile('./photo.jpg', 'caption', { chatId });
await bot.sender.sendImage('./img.png', 'caption', { chatId });
await bot.sender.sendAudio('./audio.mp3', '', { chatId });
await bot.sender.sendVideo('./video.mp4', '', { chatId });
await bot.sender.sendDocument('./doc.pdf', 'Here', { chatId });
await bot.sender.sendBuffer(buffer, 'file.jpg', { chatId, mimeType: 'image/jpeg' });
```

### Types

| Class | Fields |
|-------|--------|
| `Chat` | `chatId`, `title`, `owner`, `participants`, `message`, `lastmsguid` |
| `Message` | `msguid`, `msg` |
| `MediaInfo` | `fileId`, `fileName`, `mimeType`, `size`, `width`, `height`, `thumbnail` |
| `Participant` | `dname`, `zuid` |
| `ChatManager` | `parseChatData()` → `{ chatId: Chat }` |

## Defaults

All API URLs and constants are centralized in `src/Defaults/index.js`:

```js
const { Defaults } = require('arattix');
console.log(Defaults.WEB_BASE_URL);        // https://web.arattai.in
console.log(Defaults.FILE_DOWNLOAD_URL);    // https://files.arattai.in/webdownload
console.log(Defaults.DOWNLOAD_SERVICE);     // CLIQ
```

## License

MIT
