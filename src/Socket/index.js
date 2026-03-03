const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const { QRLogin, SessionManager } = require('../Auth');
const Bot = require('./bot');
const Defaults = require('../Defaults');

/**
 * Main entry point for the Arattix library.
 * Creates a session, handles authentication, and returns a Bot instance.
 */
class ArattixBot {
  /**
   * @param {object} [options]
   * @param {boolean} [options.isShowQr=true] - Display QR code in terminal.
   * @param {string|null} [options.proxy=null] - HTTP proxy URL.
   */
  constructor({ isShowQr = true, proxy = null } = {}) {
    this.isShowQr = isShowQr;
    this.token = null;

    const jar = new CookieJar();
    const axiosConfig = {
      jar,
      withCredentials: true,
      headers: { common: {} },
    };

    if (proxy) {
      axiosConfig.proxy = false;
      const { HttpsProxyAgent } = require('https-proxy-agent');
      axiosConfig.httpsAgent = new HttpsProxyAgent(proxy);
    }

    this.session = wrapper(axios.create(axiosConfig));
  }

  /**
   * Authenticate using QR code login.
   * Reuses saved session if valid.
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
