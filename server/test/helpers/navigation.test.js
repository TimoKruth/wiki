const navigationHelper = require('../../helpers/navigation')

const treeWith = item => [{
  locale: 'en',
  items: [item]
}]

describe('helpers/navigation/validateTree', () => {
  it('accepts valid links, headers, and dividers', () => {
    expect(navigationHelper.validateTree([{
      locale: 'en',
      items: [
        { kind: 'link', label: 'Home', targetType: 'home', target: '' },
        { kind: 'link', label: 'Docs', targetType: 'page', target: '/en/docs' },
        { kind: 'header', label: 'Resources' },
        { kind: 'divider' }
      ]
    }])).toBe(true)
  })

  it.each(['link', 'header'])('rejects blank %s labels', kind => {
    expect(() => navigationHelper.validateTree(treeWith({
      kind,
      label: '   ',
      targetType: 'home',
      target: ''
    }))).toThrow('Navigation link and header labels cannot be blank.')
  })

  it('rejects overlong labels', () => {
    expect(() => navigationHelper.validateTree(treeWith({
      kind: 'header',
      label: 'a'.repeat(navigationHelper.LABEL_MAX_LENGTH + 1)
    }))).toThrow('Navigation labels cannot exceed 255 characters.')
  })

  it('rejects blank non-home link targets', () => {
    expect(() => navigationHelper.validateTree(treeWith({
      kind: 'link',
      label: 'Documentation',
      targetType: 'external',
      target: '   '
    }))).toThrow('Navigation link targets cannot be blank.')
  })

  it('rejects overlong link targets', () => {
    expect(() => navigationHelper.validateTree(treeWith({
      kind: 'link',
      label: 'Documentation',
      targetType: 'external',
      target: `https://example.com/${'a'.repeat(navigationHelper.TARGET_MAX_LENGTH)}`
    }))).toThrow('Navigation link targets cannot exceed 2048 characters.')
  })
})
