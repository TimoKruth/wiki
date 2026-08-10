const crypto = require('crypto')
const path = require('path')
const sanitize = require('sanitize-filename')

module.exports = {
  /**
   * Generate unique hash from page
   */
  generateHash(assetPath) {
    return crypto.createHash('sha1').update(assetPath).digest('hex')
  },

  getPathInfo(assetPath) {
    return path.parse(assetPath.toLowerCase())
  },

  /**
   * Normalize an asset filename for filesystem and Markdown link safety.
   */
  sanitizeFilename(filename) {
    return sanitize(filename.toLowerCase().replace(/[\s,;#()[\]]+/g, '_'))
  }
}
