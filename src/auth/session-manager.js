const fs = require('fs');
const path = require('path');

class SessionManager {
  /**
   * Manages session persistence (cookies + headers) to/from disk.
   * @param {import('axios').AxiosInstance} session - An axios instance with cookie jar support.
   */
  constructor(session) {
    this.session = session;
  }

  /**
   * Save cookies to a JSON file.
   * @param {string} filename - Path to save cookies.
   */
  async saveCookies(filename = 'cookies.json') {
    const jar = this.session.defaults.jar;
    const serialized = jar.toJSON();
    fs.writeFileSync(filename, JSON.stringify(serialized, null, 2), 'utf-8');
  }

  /**
   * Save headers to a JSON file.
   * @param {string} filename - Path to save headers.
   */
  saveHeaders(filename = 'headers.json') {
    const headers = { ...this.session.defaults.headers.common };
    fs.writeFileSync(filename, JSON.stringify(headers, null, 2), 'utf-8');
  }

  /**
   * Load cookies from a JSON file into the session cookie jar.
   * @param {string} filename - Path to load cookies from.
   */
  async loadCookies(filename = 'cookies.json') {
    if (!fs.existsSync(filename)) throw new Error(`Cookie file not found: ${filename}`);

    const { CookieJar } = require('tough-cookie');
    const raw = JSON.parse(fs.readFileSync(filename, 'utf-8'));
    const restoredJar = CookieJar.fromJSON(raw);

    // Copy cookies into the session jar
    const stores = restoredJar.toJSON().cookies || [];
    for (const cookie of stores) {
      const domain = cookie.domain.startsWith('.') ? cookie.domain : '.' + cookie.domain;
      const url = `https://${domain.replace(/^\./, '')}${cookie.path || '/'}`;
      const { Cookie } = require('tough-cookie');
      const c = Cookie.fromJSON(cookie);
      if (c) {
        await this.session.defaults.jar.setCookie(c, url);
      }
    }
  }

  /**
   * Load headers from a JSON file into the session.
   * @param {string} filename - Path to load headers from.
   */
  loadHeaders(filename = 'headers.json') {
    if (!fs.existsSync(filename)) throw new Error(`Headers file not found: ${filename}`);

    const headers = JSON.parse(fs.readFileSync(filename, 'utf-8'));
    Object.assign(this.session.defaults.headers.common, headers);
  }

  /**
   * Save both cookies and headers.
   */
  async saveSession() {
    await this.saveCookies();
    this.saveHeaders();
  }

  /**
   * Load both headers and cookies.
   */
  async loadSession() {
    this.loadHeaders();
    await this.loadCookies();
  }

  /**
   * Test if the current session cookies are still valid.
   * Loads saved session and checks if the Arattai web URL resolves without redirect.
   * @returns {Promise<boolean>} Whether the session is valid.
   */
  async testCookies() {
    try {
      await this.loadSession();
      await this.loadCookies();
    } catch (e) {
      return false;
    }

    const url = 'https://web.arattai.in/';
    try {
      const resp = await this.session.get(url, {
        timeout: 10000,
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400,
      });
      // If no redirect, session is valid
      return true;
    } catch (err) {
      // Redirect (3xx) or error means invalid session
      if (err.response && err.response.status >= 300 && err.response.status < 400) {
        return false;
      }
      return false;
    }
  }
}

module.exports = SessionManager;
