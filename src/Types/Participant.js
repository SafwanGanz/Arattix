/**
 * Represents a chat participant / user.
 */
class Participant {
  /**
   * @param {string} dname - Display name.
   * @param {string} zuid - Zone user ID.
   */
  constructor(dname, zuid) {
    this.dname = dname;
    this.zuid = zuid;
  }

  getDname() {
    return this.dname;
  }

  getZuid() {
    return this.zuid;
  }
}

module.exports = Participant;
