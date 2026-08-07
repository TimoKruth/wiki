const pageHelper = require('../../helpers/page')
const { injectPageMetadata } = pageHelper

beforeEach(() => {
  global.WIKI = {
    config: {
      lang: {
        code: 'en',
        namespacing: false,
        namespaces: ['en', 'fr']
      }
    }
  }
})

describe('helpers/page/injectPageMetadata', () => {
  const page = {
    title: 'PAGE TITLE',
    description: 'A PAGE',
    isPublished: true,
    updatedAt: new Date(),
    content: 'TEST CONTENT',
    createdAt: new Date('2019-01-01')
  }

  it('returns the page content by default when content type is unknown', () => {
    const expected = 'TEST CONTENT'
    const result = injectPageMetadata(page)
    expect(result).toEqual(expected)
  })

  it('injects metadata for markdown contents', () => {
    const markdownPage = {
      ...page,
      contentType: 'markdown',
      editorKey: 'markdown'
    }

    const expected = `---
title: ${markdownPage.title}
description: ${markdownPage.description}
published: ${markdownPage.isPublished.toString()}
date: ${markdownPage.updatedAt}
tags:\x20
editor: ${markdownPage.editorKey}
dateCreated: ${markdownPage.createdAt}\n---

TEST CONTENT`

    const result = injectPageMetadata(markdownPage)
    expect(result).toEqual(expected)
  })

  it('injects metadata for html contents', () => {
    const htmlPage = {
      ...page,
      contentType: 'html',
      editorKey: 'html'
    }

    const expected = `<!--
title: ${htmlPage.title}
description: ${htmlPage.description}
published: ${htmlPage.isPublished.toString()}
date: ${htmlPage.updatedAt}
tags:\x20
editor: ${htmlPage.editorKey}
dateCreated: ${htmlPage.createdAt}\n-->

TEST CONTENT`

    const result = injectPageMetadata(htmlPage)
    expect(result).toEqual(expected)
  })
})

describe('helpers/page/parsePath', () => {
  it('does not mistake an arbitrary two-letter folder for a locale', () => {
    expect(pageHelper.parsePath('/db/postgres')).toMatchObject({
      locale: 'en',
      path: 'db/postgres',
      explicitLocale: false
    })
  })

  it('recognizes configured locale prefixes', () => {
    expect(pageHelper.parsePath('/fr/guide')).toMatchObject({
      locale: 'fr',
      path: 'guide',
      explicitLocale: true
    })
  })
})

describe('helpers/page/resolvePageHref', () => {
  it('resolves relative page links as siblings', () => {
    expect(pageHelper.resolvePageHref('other-doc', {
      locale: 'en',
      path: 'guide/current-doc'
    })).toBe('/guide/other-doc')
  })

  it('adds the active locale when namespacing is enabled', () => {
    global.WIKI.config.lang.namespacing = true
    expect(pageHelper.resolvePageHref('other-doc', {
      locale: 'fr',
      path: 'guide/current-doc'
    })).toBe('/fr/guide/other-doc')
  })
})

describe('helpers/page/resolveNavigationHref', () => {
  it('uses the current locale instead of a locale stored in the navigation item', () => {
    global.WIKI.config.lang.namespacing = true
    expect(pageHelper.resolveNavigationHref({
      target: '/en/guide',
      targetType: 'page',
      locale: 'fr'
    })).toBe('/fr/guide')
  })

  it('removes locale prefixes when namespacing is disabled', () => {
    expect(pageHelper.resolveNavigationHref({
      target: '/en/guide',
      targetType: 'page',
      locale: 'en'
    })).toBe('/guide')
  })
})
