/**
 * Represents a single chat message (from v1 API).
 */
class Message {
  /**
   * @param {string} msguid - Unique message ID.
   * @param {string} msg - Message content text.
   */
  constructor(msguid, msg) {
    this.msguid = msguid;
    this.msg = msg;
  }
}

/**
 * Represents media info extracted from a v2 file message.
 *
 * File message format from v2 API:
 * ```json
 * {
 *   "type": "file",
 *   "content": {
 *     "thumbnail": { "height": "195", "width": "400", "blur_data": "/9j/..." },
 *     "file": {
 *       "name": "photo.jpg",
 *       "type": "image/jpeg",
 *       "dimensions": { "height": 625, "tnheight": 195, "size": 195287, "tnwidth": 400, "width": 1280 },
 *       "id": "i5b22..."
 *     }
 *   }
 * }
 * ```
 */
class MediaInfo {
  /**
   * @param {object} raw - Raw v2 message with type 'file'.
   */
  constructor(raw) {
    const file = raw.content?.file || {};
    const thumb = raw.content?.thumbnail || null;
    this.fileId = file.id || null;
    this.fileName = file.name || 'unknown';
    this.mimeType = file.type || 'application/octet-stream';
    this.size = file.dimensions?.size || 0;
    this.width = file.dimensions?.width || 0;
    this.height = file.dimensions?.height || 0;
    this.thumbnail = thumb;
    this.raw = raw;
  }

  get isImage() { return this.mimeType.startsWith('image/'); }
  get isAudio() { return this.mimeType.startsWith('audio/'); }
  get isVideo() { return this.mimeType.startsWith('video/'); }
  get isDocument() { return !this.isImage && !this.isAudio && !this.isVideo; }

  get sizeKB() { return (this.size / 1024).toFixed(1); }
  get sizeMB() { return (this.size / (1024 * 1024)).toFixed(2); }

  get typeIcon() {
    if (this.isImage) return '🖼️';
    if (this.isAudio) return '🎵';
    if (this.isVideo) return '🎬';
    return '📄';
  }

  toString() {
    return `${this.typeIcon} ${this.fileName} (${this.mimeType}, ${this.sizeKB}KB)`;
  }

  /**
   * Create a MediaInfo from a raw v2 message, or null if not a file message.
   * @param {object} msg - Raw v2 message.
   * @returns {MediaInfo|null}
   */
  static from(msg) {
    if (msg?.type !== 'file' || !msg?.content?.file) return null;
    return new MediaInfo(msg);
  }
}

module.exports = { Message, MediaInfo };
