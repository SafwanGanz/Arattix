const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const { QRLogin, SessionManager } = require('./auth');
const Bot = require('./models/bot');

/**
 * Main entry point for the Arattix library.
 * Creates a session, handles authentication, and returns a Bot instance.
 */
class ArattixBot {
  /**
   * @param {object} [options]
   * @param {boolean} [options.isShowQr=true] - Whether to display the QR code in the terminal.
   * @param {string|null} [options.proxy=null] - Optional HTTP proxy URL (e.g. "http://127.0.0.1:8888").
   */
  constructor({ isShowQr = true, proxy = null } = {}) {
    this.isShowQr = isShowQr;
    this.token = null;

    // Create a cookie-jar-aware axios instance
    const jar = new CookieJar();

    const axiosConfig = {
      jar,
      withCredentials: true,
      headers: {
        common: {},
      },
    };

    if (proxy) {
      // Support proxy via environment or axios-level config
      axiosConfig.proxy = false; // disable default proxy detection
      const { HttpsProxyAgent } = require('https-proxy-agent');
      axiosConfig.httpsAgent = new HttpsProxyAgent(proxy);
    }

    this.session = wrapper(axios.create(axiosConfig));
  }

  /**
   * Authenticate using QR code login.
   * If a saved session is valid, it reuses it. Otherwise, starts QR login flow.
   * @returns {Promise<Bot>} An authenticated Bot instance.
   */
  async loginWithQr() {
    const sessionManager = new SessionManager(this.session);

    const isValid = await sessionManager.testCookies();
    if (isValid) {
      return new Bot(this.session);
    }

    const qr = new QRLogin(this.session);
    const qrResp = await qr.initiateLogin();
    await sessionManager.saveSession();

    if (qrResp) {
      return new Bot(this.session);
    }

    throw new Error('QR Login failed');
  }
}

module.exports = ArattixBot;
