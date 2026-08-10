const commonHelper = require('../../helpers/common')

beforeEach(() => {
  global.WIKI = {
    config: {
      host: 'https://wiki.example.com'
    }
  }
})

describe('helpers/common/getCookieOpts', () => {
  it('sets a persistent expiration for normal authentication cookies', () => {
    expect(commonHelper.getCookieOpts()).toMatchObject({
      secure: true,
      expires: expect.any(Date)
    })
  })

  it('omits the future expiration when clearing authentication cookies', () => {
    expect(commonHelper.getCookieOpts({ persistent: false })).toEqual({
      secure: true
    })
  })
})
