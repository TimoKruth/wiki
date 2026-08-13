const qs = require('querystring')
const _ = require('lodash')
const crypto = require('crypto')
const path = require('path')
const cheerio = require('cheerio')

const localeSegmentRegex = /^[A-Z]{2}(-[A-Z]{2})?$/i
const localeFolderRegex = /^([a-z]{2}(?:-[a-z]{2})?\/)?(.*)/i
// eslint-disable-next-line no-control-regex
const unsafeCharsRegex = /[\x00-\x1f\x80-\x9f\\"|<>:*?]/

const contentToExt = {
  markdown: 'md',
  asciidoc: 'adoc',
  html: 'html'
}
const extToContent = _.invert(contentToExt)

/* global WIKI */

module.exports = {
  /**
   * Check whether a path segment is an active site locale.
   */
  isLocaleSegment (segment) {
    if (!localeSegmentRegex.test(segment)) {
      return false
    }
    const activeLocales = _.uniq([
      _.get(WIKI.config, 'lang.code', 'en'),
      ..._.get(WIKI.config, 'lang.namespaces', [])
    ]).map(locale => locale.toLowerCase())
    return activeLocales.includes(segment.toLowerCase())
  },
  /**
   * Build a public page href using the site's locale mode.
   */
  getPageHref ({ locale, path: pagePath }) {
    return WIKI.config.lang.namespacing ? `/${locale}/${pagePath}` : `/${pagePath}`
  },
  /**
   * Normalize a configured navigation target for the page's active locale.
   */
  resolveNavigationHref ({ target, targetType, locale }) {
    if (['external', 'externalblank', 'search'].includes(targetType)) {
      return target
    }
    if (targetType === 'home') {
      return WIKI.config.lang.namespacing ? `/${locale}/home` : '/'
    }
    let targetPath = _.trimStart(target || '', '/')
    const targetParts = targetPath.split('/')
    if (this.isLocaleSegment(targetParts[0])) {
      targetParts.shift()
      targetPath = targetParts.join('/')
    }
    return this.getPageHref({ locale, path: targetPath })
  },
  /**
   * Resolve a page link using browser URL semantics.
   */
  resolvePageHref (href, { locale, path: pagePath, absolute = false }) {
    const origin = 'http://wikijs.local'
    let target = href
    if (WIKI.config.lang.namespacing) {
      if (_.startsWith(target, '/')) {
        const firstSegment = target.split('/')[1]
        if (!this.isLocaleSegment(firstSegment)) {
          target = `/${locale}${target}`
        }
      } else {
        const basePath = absolute ? `/${locale}/` : `/${locale}/${pagePath}`
        const parsedTarget = new URL(target, `${origin}${basePath}`)
        target = `${parsedTarget.pathname}${parsedTarget.search}${parsedTarget.hash}`
      }
    } else if (!_.startsWith(target, '/')) {
      const basePath = absolute ? '/' : `/${pagePath}`
      const parsedTarget = new URL(target, `${origin}${basePath}`)
      target = `${parsedTarget.pathname}${parsedTarget.search}${parsedTarget.hash}`
    }
    return target
  },
  /**
   * Update rendered internal links after a page is created, moved, or deleted.
   */
  updateRenderedPageLinks (render, opts) {
    const $ = cheerio.load(render, {
      decodeEntities: true
    })
    const fromLocale = opts.mode === 'move' ? opts.sourceLocale : opts.locale
    const fromPath = opts.mode === 'move' ? opts.sourcePath : opts.path
    const fromClass = opts.mode === 'create' ? 'is-invalid-page' : 'is-valid-page'
    const toClass = opts.mode === 'delete' ? 'is-invalid-page' : 'is-valid-page'
    let changed = false

    $('a.is-internal-link').each((idx, elm) => {
      const href = $(elm).attr('href')
      if (!href || !$(elm).hasClass(fromClass)) {
        return
      }
      try {
        const parsedUrl = new URL(href, 'http://wikijs.local')
        const page = this.parsePath(parsedUrl.pathname)
        if (page.locale !== fromLocale || page.path !== fromPath) {
          return
        }
        if (opts.mode === 'move') {
          const destinationHref = this.getPageHref({ locale: opts.locale, path: opts.path })
          $(elm).attr('href', `${destinationHref}${parsedUrl.search}${parsedUrl.hash}`)
        }
        $(elm).removeClass(fromClass).addClass(toClass)
        changed = true
      } catch (err) {
        // Ignore malformed href values and leave the rendered link untouched.
      }
    })

    return {
      changed,
      render: decodeBody($)
    }
  },
  /**
   * Parse raw url path and make it safe
   */
  parsePath (rawPath, opts = {}) {
    let pathObj = {
      locale: WIKI.config.lang.code,
      path: 'home',
      private: false,
      privateNS: '',
      explicitLocale: false
    }

    // Clean Path
    rawPath = _.trim(qs.unescape(rawPath))
    if (_.startsWith(rawPath, '/')) { rawPath = rawPath.substring(1) }
    rawPath = rawPath.replace(unsafeCharsRegex, '')
    if (rawPath === '') { rawPath = 'home' }

    rawPath = rawPath.replace(/\\/g, '').replace(/\/\//g, '').replace(/\.\.+/ig, '')

    // Extract Info
    let pathParts = _.filter(_.split(rawPath, '/'), p => {
      p = _.trim(p)
      return !_.isEmpty(p) && p !== '..' && p !== '.'
    })
    if (pathParts[0].length === 1) {
      pathParts.shift()
    }
    if (this.isLocaleSegment(pathParts[0])) {
      pathObj.locale = pathParts[0]
      pathObj.explicitLocale = true
      pathParts.shift()
    }

    // Strip extension
    if (opts.stripExt && pathParts.length > 0) {
      const lastPart = _.last(pathParts)
      if (lastPart.indexOf('.') > 0) {
        pathParts.pop()
        const lastPartMeta = path.parse(lastPart)
        pathParts.push(lastPartMeta.name)
      }
    }

    pathObj.path = _.join(pathParts, '/')
    return pathObj
  },
  /**
   * Generate unique hash from page
   */
  generateHash(opts) {
    return crypto.createHash('sha1').update(`${opts.locale}|${opts.path}|${opts.privateNS}`).digest('hex')
  },
  /**
   * Inject Page Metadata
   */
  injectPageMetadata(page) {
    let meta = [
      ['title', page.title],
      ['description', page.description],
      ['published', page.isPublished.toString()],
      ['date', page.updatedAt],
      ['tags', page.tags ? page.tags.map(t => t.tag).join(', ') : ''],
      ['editor', page.editorKey],
      ['dateCreated', page.createdAt]
    ]
    switch (page.contentType) {
      case 'markdown':
        return '---\n' + meta.map(mt => `${mt[0]}: ${mt[1]}`).join('\n') + '\n---\n\n' + page.content
      case 'html':
        return '<!--\n' + meta.map(mt => `${mt[0]}: ${mt[1]}`).join('\n') + '\n-->\n\n' + page.content
      case 'json':
        return {
          ...page.content,
          _meta: _.fromPairs(meta)
        }
      default:
        return page.content
    }
  },
  /**
   * Normalize source timestamps parsed from page front matter.
   */
  getSourceTimestamps (metadata = {}) {
    return _.pickBy({
      createdAt: normalizeTimestamp(metadata.dateCreated),
      updatedAt: normalizeTimestamp(metadata.date)
    }, Boolean)
  },
  /**
   * Check if path is a reserved path
   */
  isReservedPath(rawPath) {
    const firstSection = _.head(rawPath.split('/'))
    if (firstSection.length <= 1) {
      return true
    } else if (this.isLocaleSegment(firstSection)) {
      return true
    } else if (
      _.some(WIKI.data.reservedPaths, p => {
        return p === firstSection
      })) {
      return true
    } else {
      return false
    }
  },
  /**
   * Get file extension from content type
   */
  getFileExtension(contentType) {
    return _.get(contentToExt, contentType, 'txt')
  },
  /**
   * Get content type from file extension
   */
  getContentType (filePath) {
    const ext = _.last(filePath.split('.'))
    return _.get(extToContent, ext, false)
  },
  /**
   * Get Page Meta object from disk path
   */
  getPagePath (filePath) {
    let fpath = filePath
    if (process.platform === 'win32') {
      fpath = filePath.replace(/\\/g, '/')
    }
    let meta = {
      locale: WIKI.config.lang.code,
      path: _.initial(fpath.split('.')).join('')
    }
    const result = localeFolderRegex.exec(meta.path)
    if (result[1]) {
      meta = {
        locale: result[1].replace('/', ''),
        path: result[2]
      }
    }
    return meta
  }
}

function decodeBody ($) {
  return $.html('body').replace('<body>', '').replace('</body>', '')
}

function normalizeTimestamp (value) {
  if (_.isNil(value) || value === '') {
    return null
  }
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
