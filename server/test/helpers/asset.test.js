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
