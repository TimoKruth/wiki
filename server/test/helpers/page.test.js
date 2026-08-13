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
    },
    data: {
      reservedPaths: ['login']
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

describe('helpers/page/getSourceTimestamps', () => {
  it('normalizes YAML dates for imported pages', () => {
    expect(pageHelper.getSourceTimestamps({
      dateCreated: new Date('2020-01-02T03:04:05Z'),
      date: '2021-02-03T04:05:06+02:00'
    })).toEqual({
      createdAt: '2020-01-02T03:04:05.000Z',
      updatedAt: '2021-02-03T02:05:06.000Z'
    })
  })

  it('ignores missing and invalid source dates', () => {
    expect(pageHelper.getSourceTimestamps({ date: 'not-a-date' })).toEqual({})
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

  it('allows unconfigured two-letter folders', () => {
    expect(pageHelper.isReservedPath('db/postgres')).toBe(false)
  })

  it('continues to reserve configured locale prefixes', () => {
    expect(pageHelper.isReservedPath('fr/guide')).toBe(true)
  })
})

describe('helpers/page/resolvePageHref', () => {
  it('resolves relative page links as siblings', () => {
    expect(pageHelper.resolvePageHref('other-doc', {
      locale: 'en',
      path: 'guide/current-doc'
    })).toBe('/guide/other-doc')
  })

  it('preserves query strings and fragments on relative page links', () => {
    expect(pageHelper.resolvePageHref('other-doc?view=compact#section', {
      locale: 'en',
      path: 'guide/current-doc'
    })).toBe('/guide/other-doc?view=compact#section')
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

  it('leaves legacy search targets unchanged', () => {
    expect(pageHelper.resolveNavigationHref({
      target: 'release notes',
      targetType: 'search',
      locale: 'en'
    })).toBe('release notes')
  })
})

describe('helpers/page/updateRenderedPageLinks', () => {
  it('validates links while preserving query strings, fragments, and other attributes', () => {
    const result = pageHelper.updateRenderedPageLinks(
      '<p><a title="More" href="/guide/next?view=compact#part" class="is-internal-link is-invalid-page">Next</a></p>',
      { mode: 'create', locale: 'en', path: 'guide/next' }
    )

    expect(result.changed).toBe(true)
    expect(result.render).toContain('href="/guide/next?view=compact#part"')
    expect(result.render).toContain('title="More"')
    expect(result.render).toContain('is-internal-link is-valid-page')
  })

  it('moves links while preserving query strings and fragments', () => {
    const result = pageHelper.updateRenderedPageLinks(
      '<a href="/guide/old?view=compact#part" class="is-internal-link is-valid-page">Old</a>',
      {
        mode: 'move',
        sourceLocale: 'en',
        sourcePath: 'guide/old',
        locale: 'en',
        path: 'docs/new'
      }
    )

    expect(result.changed).toBe(true)
    expect(result.render).toContain('href="/docs/new?view=compact#part"')
    expect(result.render).toContain('is-internal-link is-valid-page')
  })

  it('invalidates links when a page is deleted', () => {
    const result = pageHelper.updateRenderedPageLinks(
      '<a href="/guide/old" class="is-internal-link is-valid-page">Old</a>',
      { mode: 'delete', locale: 'en', path: 'guide/old' }
    )

    expect(result.changed).toBe(true)
    expect(result.render).toContain('is-internal-link is-invalid-page')
  })
})
