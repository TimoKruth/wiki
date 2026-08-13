const assetHelper = require('../../helpers/asset')

describe('helpers/asset/sanitizeFilename', () => {
  it('replaces characters that conflict with Markdown link syntax', () => {
    expect(assetHelper.sanitizeFilename('a[b).PNG')).toBe('a_b_.png')
  })

  it('preserves the existing whitespace normalization behavior', () => {
    expect(assetHelper.sanitizeFilename('My File.PNG')).toBe('my_file.png')
  })

  it('continues to remove filesystem-unsafe characters', () => {
    expect(assetHelper.sanitizeFilename('folder/file?.png')).toBe('folderfile.png')
  })
})

describe('helpers/asset/rewriteHtmlReferences', () => {
  it('updates image and download references while preserving query strings and fragments', () => {
    const result = assetHelper.rewriteHtmlReferences(
      '<figure><img src="/images/old.png?size=large#preview"></figure><a href="/images/old.png">Download</a>',
      'images/old.png',
      'images/new.png'
    )

    expect(result.changed).toBe(true)
    expect(result.html).toContain('src="/images/new.png?size=large#preview"')
    expect(result.html).toContain('href="/images/new.png"')
  })

  it('leaves external and similarly named assets unchanged', () => {
    const html = '<img src="https://cdn.example.com/images/old.png"><img src="/images/old.png.bak">'
    expect(assetHelper.rewriteHtmlReferences(html, 'images/old.png', 'images/new.png')).toEqual({
      changed: false,
      html
    })
  })
})
