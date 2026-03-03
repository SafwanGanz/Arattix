const qrcode = require('qrcode-terminal');
const Defaults = require('../Defaults');

/**
 * Handles QR-code based authentication for Arattai.
 */
class QRLogin {
  /**
   * @param {import('axios').AxiosInstance} session - Axios instance with cookie jar support.
   */
  constructor(session) {
    this.qrGenerateUrl = Defaults.QR_AUTH_URL;
    this.baseUrl = Defaults.WEB_BASE_URL;
    this.session = session;
    this.stopFlag = false;
    this.qrResp = null;
    this.cliTime = Date.now();
  }

  /**
   * Initial page visit to establish session cookies.
   */
  async prepareQr() {
    await this.session.get(Defaults.ACCOUNTS_BASE_URL, { maxRedirects: 10 });

    const params = {
      QRLogin: true,
      servicename: 'Arattai',
      serviceurl: this.baseUrl,
    };

    await this.session.get(
      this.qrGenerateUrl.replace('/v2/qrcode', ''),
      { params }
    );
  }

  /**
   * Request QR code data from the server.
   * @returns {object} The QR code auth response JSON.
   */
  async requestQrData() {
    await this.prepareQr();
    this.cliTime = Date.now();

    const params = {
      cli_time: this.cliTime,
      servicename: 'Arattai',
      serviceurl: this.baseUrl,
    };

    // Extract CSRF token from cookies
    const cookieJar = this.session.defaults.jar;
    const cookies = await cookieJar.getCookies(Defaults.ACCOUNTS_BASE_URL);
    const csrfCookie = cookies.find((c) => c.key === 'iamcsr');
    const csrfToken = csrfCookie ? csrfCookie.value : '';

    this.session.defaults.headers.common['X-ZCSRF-TOKEN'] = 'iamcsrcoo=' + csrfToken;
    this.session.defaults.headers.common['User-Agent'] = Defaults.DEFAULT_USER_AGENT;

    const resp = await this.session.post(this.qrGenerateUrl, '{"qrcodeauth":{"remember":true}}', {
      params,
      headers: { 'Content-Type': 'application/json' },
    });

    this.qrResp = resp.data;
    return resp.data;
  }

  /**
   * Display the QR code in the terminal.
   * @returns {boolean} Whether the QR code was displayed.
   */
  showQr() {
    if (this.qrResp && this.qrResp.qrcodeauth && this.qrResp.qrcodeauth.token) {
      const qrData = this.qrResp.qrcodeauth.oneauth_url;
      qrcode.generate(qrData, { small: true }, (code) => {
        console.log(code);
      });
      return true;
    }
    return false;
  }

  /**
   * Poll the server until the QR code is scanned and authenticated.
   * @returns {Promise<boolean>} Whether authentication was successful.
   */
  async validateQr() {
    while (!this.stopFlag) {
      if (!this.qrResp || !this.qrResp.qrcodeauth || !this.qrResp.qrcodeauth.token) {
        await this.requestQrData();
        this.showQr();
      } else {
        const params = {
          cli_time: this.cliTime,
          servicename: 'AaaServer',
          serviceurl: this.baseUrl,
        };

        const token = this.qrResp.qrcodeauth.token;
        this.session.defaults.headers.common['Z-Authorization'] = 'Zoho-ticket ' + token;

        const resp = await this.session.put(
          this.qrGenerateUrl,
          '{"qrcodeauth":{"remember":true}}',
          {
            params,
            headers: { 'Content-Type': 'application/json' },
          }
        );

        const statusCode = resp.data.status_code;

        if (statusCode === 401) {
          await this.requestQrData();
          this.showQr();
        } else if (statusCode === 200) {
          console.log('Authentication Successful');
          this.stopFlag = true;
          return true;
        }

        // Wait 5 seconds before polling again
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
    return false;
  }

  /**
   * Entry point: initiates the full QR login flow.
   * @returns {Promise<boolean>} Whether login succeeded.
   */
  async initiateLogin() {
    return this.validateQr();
  }
}

module.exports = QRLogin;
