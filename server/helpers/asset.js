const crypto = require('crypto')
const path = require('path')
const sanitize = require('sanitize-filename')
const cheerio = require('cheerio')

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
  },

  /**
   * Rewrite root-relative asset references in an HTML fragment.
   */
  rewriteHtmlReferences (html, sourcePath, destinationPath) {
    if (!html) {
      return { changed: false, html }
    }
    const sourceHref = normalizeAssetPath(sourcePath)
    const destinationHref = normalizeAssetPath(destinationPath)
    const $ = cheerio.load(html, { decodeEntities: false }, false)
    let changed = false

    $('[src], [href]').each((idx, elm) => {
      for (const attr of ['src', 'href']) {
        const value = $(elm).attr(attr)
        const replacement = rewriteAssetUrl(value, sourceHref, destinationHref)
        if (replacement !== value) {
          $(elm).attr(attr, replacement)
          changed = true
        }
      }
    })

    return {
      changed,
      html: changed ? $.html() : html
    }
  }
}

function normalizeAssetPath (assetPath) {
  return `/${String(assetPath || '').replace(/^\/+/, '')}`
}

function rewriteAssetUrl (value, sourceHref, destinationHref) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return value
  }
  try {
    const parsed = new URL(value, 'http://wikijs.local')
    if (decodeURIComponent(parsed.pathname) !== sourceHref) {
      return value
    }
    return `${destinationHref}${parsed.search}${parsed.hash}`
  } catch (err) {
    return value
  }
}
