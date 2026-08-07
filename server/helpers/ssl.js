const crypto = require('crypto')

module.exports = {
  getCertificateExpiration (certificate) {
    if (!certificate) {
      return null
    }
    try {
      return new Date(new crypto.X509Certificate(certificate).validTo).toISOString()
    } catch (err) {
      return null
    }
  }
}
