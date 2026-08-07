const MarkdownIt = require('markdown-it')
const markdownAttrs = require('markdown-it-attrs')

const katexRenderer = require('../../../modules/rendering/markdown-katex/renderer')

beforeEach(() => {
  global.WIKI = {
    logger: {
      warn: jest.fn()
    }
  }
})

describe('rendering/markdown-katex', () => {
  it('preserves inline TeX expressions ending in braces', () => {
    const md = new MarkdownIt()
    katexRenderer.init(md, { useInline: true, useBlocks: false })
    md.use(markdownAttrs)

    const html = md.render('$\\frac{1}{2}$')

    expect(html).toContain('<mfrac>')
    expect(html).toContain('\\frac{1}{2}')
  })
})
