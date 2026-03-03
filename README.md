# arattix

Node.js library for **Arattai** messaging API automation — a port of the [arattai](https://pypi.org/project/arattai/) Python package.

## Installation

```bash
npm install arattix
```

## Quick Start

```js
const { ArattixBot } = require('arattix');

(async () => {
  // Initialize the bot (shows QR in terminal by default)
  const arattix = new ArattixBot({ isShowQr: true });

  // Login using QR code (reuses saved session if valid)
  const bot = await arattix.loginWithQr();

  // Fetch chats (limit to 500)
  const chats = await bot.fetchChats({ limit: 500 });
  console.log(chats);

  // Send a text message using a Chat object
  const chatId = Object.keys(chats)[0];
  await bot.sender.sendMessage('Hello from arattix!', { chat: chats[chatId] });

  // Send a text message to a specific chat ID
  await bot.sender.sendMessage('Hello!', { chatId: '2343453654645_chat_id' });

  // Send a file with caption using a Chat object
  await bot.sender.sendFile('photo.jpg', 'My caption', { chat: chats[chatId] });

  // Send a file with caption to a specific chat ID
  await bot.sender.sendFile('document.pdf', 'Important doc', { chatId: '2343453654645_chat_id' });
})();
```

## API Reference

### `ArattixBot`

Main entry point. Creates a session and handles authentication.

```js
const arattix = new ArattixBot({ isShowQr: true, proxy: null });
```

| Option     | Type      | Default | Description                                   |
|------------|-----------|---------|-----------------------------------------------|
| `isShowQr` | `boolean` | `true`  | Display QR code in the terminal               |
| `proxy`    | `string`  | `null`  | HTTP proxy URL (e.g. `http://127.0.0.1:8888`) |

#### `arattix.loginWithQr() → Promise<Bot>`

Authenticates via QR code. Reuses saved session cookies if still valid.

---

### `Bot`

Returned after successful login. Provides chat and messaging functionality.

#### `bot.fetchChats({ pinned, limit }) → Promise<Object>`

Fetch chats from the server.

| Option   | Type      | Default | Description                 |
|----------|-----------|---------|-----------------------------|
| `pinned` | `boolean` | `false` | Fetch only pinned chats     |
| `limit`  | `number`  | `20`    | Max number of chats to get  |

Returns an object mapping `chatId → Chat`.

#### `bot.sender → MessageSender`

Returns a `MessageSender` instance for this session.

---

### `MessageSender`

#### `sender.sendMessage(message, { chatId?, dname?, chat? }) → Promise`

Send a text message to a chat.

#### `sender.sendFile(filePath, caption, { chatId?, dname?, chat? }) → Promise`

Send a file (with optional caption) to a chat.

---

### Models

- **`Chat`** — `chatId`, `title`, `owner`, `participants`, `message`, `lastmsguid`
- **`Message`** — `msguid`, `msg`
- **`Participant`** — `dname`, `zuid`

## Feature Parity with Python `arattai`

| Feature              | Python (`arattai`) | Node.js (`arattix`) |
|----------------------|--------------------|---------------------|
| QR Code Login        | ✅                 | ✅                  |
| Session Persistence  | ✅ (pickle)        | ✅ (JSON files)     |
| Fetch Chats          | ✅                 | ✅                  |
| Send Text Message    | ✅                 | ✅                  |
| Send File            | ✅                 | ✅                  |
| Token Login          | ⬜ (placeholder)   | ⬜ (placeholder)    |

## License

MIT
