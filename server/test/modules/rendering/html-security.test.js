const htmlSecurityRenderer = require('../../../modules/rendering/html-security/renderer')

describe('rendering/html-security', () => {
  it('preserves inert CKEditor media metadata for trusted post-processing', async () => {
    const output = await htmlSecurityRenderer.init(
      '<figure class="media"><oembed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"></oembed></figure>',
      { safeHTML: true, allowDrawIoUnsafe: false, allowIFrames: false }
    )

    expect(output).toContain('<oembed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"></oembed>')
    expect(output).not.toContain('<iframe')
  })
})
