const cheerio = require('cheerio')
const mediaHelper = require('../../helpers/media')

describe('helpers/media/resolveEmbed', () => {
  test.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', 'https://www.youtube.com/embed/dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'youtube', 'https://www.youtube.com/embed/dQw4w9WgXcQ'],
    ['https://vimeo.com/channels/staffpicks/243244233', 'vimeo', 'https://player.vimeo.com/video/243244233'],
    ['https://www.dailymotion.com/video/x9abcd', 'dailymotion', 'https://www.dailymotion.com/embed/video/x9abcd'],
    ['https://open.spotify.com/track/abc123', 'spotify', 'https://open.spotify.com/embed/track/abc123']
  ])('resolves %s to a trusted embed URL', (url, provider, src) => {
    expect(mediaHelper.resolveEmbed(url)).toMatchObject({ provider, src })
  })

  it('rejects non-HTTP and untrusted embed URLs', () => {
    expect(mediaHelper.resolveEmbed('javascript:alert(1)')).toBeNull()
    expect(mediaHelper.resolveEmbed('https://example.com/video/123')).toBeNull()
    expect(mediaHelper.resolveEmbed('https://youtu.be/%22%3E%3Cscript%3Ealert(1)%3C/script%3E')).toBeNull()
  })
})

describe('helpers/media/renderEmbeds', () => {
  it('renders a responsive iframe for a trusted provider', () => {
    const $ = cheerio.load('<figure class="media"><oembed url="https://vimeo.com/243244233"></oembed></figure>')

    mediaHelper.renderEmbeds($)

    expect($('.media-embed.is-vimeo iframe').attr('src')).toBe('https://player.vimeo.com/video/243244233')
    expect($('.media-embed.is-vimeo iframe').attr('allowfullscreen')).toBe('')
    expect($('oembed')).toHaveLength(0)
  })

  it('renders unsupported HTTP providers as safe links', () => {
    const $ = cheerio.load('<oembed url="https://example.com/media/123"></oembed>')

    mediaHelper.renderEmbeds($)

    expect($('a').attr('href')).toBe('https://example.com/media/123')
    expect($('a').attr('rel')).toBe('noopener noreferrer')
  })

  it('does not turn unsafe URLs into links or iframes', () => {
    const $ = cheerio.load('<oembed url="javascript:alert(1)"></oembed>')

    mediaHelper.renderEmbeds($)

    expect($('iframe, a')).toHaveLength(0)
    expect($('span').text()).toBe('Unsupported media')
  })
})
