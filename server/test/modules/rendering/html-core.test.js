const htmlCoreRenderer = require('../../../modules/rendering/html-core/renderer')

beforeEach(() => {
  global.WIKI = {
    config: {
      host: 'https://wiki.example.com',
      lang: {
        code: 'en',
        namespacing: false,
        namespaces: ['en']
      }
    },
    logger: {
      warn: jest.fn()
    }
  }
})

const render = input => htmlCoreRenderer.render.call({
  input,
  page: {
    id: 1,
    localeCode: 'en',
    path: 'home',
    $relatedQuery: jest.fn().mockResolvedValue([])
  },
  config: {
    absoluteLinks: false,
    openExternalLinkNewTab: false,
    relAttributeExternalLink: 'noreferrer'
  },
  children: [{
    key: 'htmlSecurity',
    step: 'post',
    config: {
      safeHTML: true,
      allowDrawIoUnsafe: false,
      allowIFrames: false
    }
  }]
})

describe('rendering/html-core media embeds', () => {
  it('renders a sanitized CKEditor media element using a trusted provider iframe', async () => {
    const output = await render(
      '<figure class="media"><oembed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"></oembed></figure>'
    )

    expect(output).toContain('class="media-embed is-youtube"')
    expect(output).toContain('src="https://www.youtube.com/embed/dQw4w9WgXcQ"')
    expect(output).not.toContain('<oembed')
  })

  it('does not render an iframe for an unsafe media URL', async () => {
    const output = await render(
      '<figure class="media"><oembed url="javascript:alert(1)"></oembed></figure>'
    )

    expect(output).toContain('Unsupported media')
    expect(output).not.toContain('<iframe')
  })
})
