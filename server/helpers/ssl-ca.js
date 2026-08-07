const fs = require('fs')
const path = require('path')

module.exports = {
  resolve (value, rootPath) {
    const ca = value.trim()
    const filePath = path.isAbsolute(ca) ? ca : path.resolve(rootPath, ca)
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath)
    }
    if (ca.startsWith('-----BEGIN CERTIFICATE-----')) {
      return ca
    }
    const decoded = Buffer.from(ca, 'base64').toString('utf8')
    if (decoded.startsWith('-----BEGIN CERTIFICATE-----')) {
      return decoded
    }
    const chunks = []
    for (let i = 0; i < ca.length; i += 64) {
      chunks.push(ca.substring(i, i + 64))
    }
    return `-----BEGIN CERTIFICATE-----\n${chunks.join('\n')}\n-----END CERTIFICATE-----\n`
  }
}
