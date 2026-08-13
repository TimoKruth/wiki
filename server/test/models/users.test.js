const User = require('../../models/users')

describe('models/users account lifecycle', () => {
  beforeEach(() => {
    global.WIKI = {
      auth: {
        strategies: {}
      },
      config: {
        auth: {
          autoLogin: false,
          redirectToLoginAfterLogout: false
        },
        host: 'https://wiki.example.com'
      },
      data: {
        authentication: []
      },
      logger: {
        debug: jest.fn(),
        warn: jest.fn()
      },
      mail: {
        send: jest.fn()
      },
      models: {
        users: {},
        userKeys: {}
      }
    }
  })

  it('relinks an opted-in provider account by email when its subject changes', async () => {
    const profilePatch = jest.fn().mockResolvedValue({ id: 42, providerId: 'new-subject' })
    const relinkedUser = {
      id: 42,
      isActive: true,
      isSystem: false,
      pictureUrl: '',
      $query: () => ({ patchAndFetch: profilePatch })
    }
    const relinkPatch = jest.fn().mockResolvedValue(relinkedUser)
    const existingUser = {
      id: 42,
      $query: () => ({ patchAndFetch: relinkPatch })
    }
    const findOne = jest.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingUser)

    global.WIKI.auth.strategies.keycloak = {
      key: 'keycloak',
      strategyKey: 'keycloak',
      selfRegistration: false
    }
    global.WIKI.data.authentication = [{ key: 'keycloak' }]
    global.WIKI.models.users.query = () => ({ findOne })

    const result = await User.processProfile({
      providerKey: 'keycloak',
      relinkByEmail: true,
      profile: {
        id: 'new-subject',
        email: 'User@Example.com',
        displayName: 'Example User'
      }
    })

    expect(findOne).toHaveBeenNthCalledWith(3, {
      email: 'user@example.com',
      providerKey: 'keycloak'
    })
    expect(relinkPatch).toHaveBeenCalledWith({ providerId: 'new-subject' })
    expect(profilePatch).toHaveBeenCalledWith(expect.objectContaining({
      email: 'user@example.com',
      name: 'Example User'
    }))
    expect(result).toEqual({ id: 42, providerId: 'new-subject' })
  })

  it('replaces verification tokens and sends a generic resend email', async () => {
    const deleteWhereNot = jest.fn().mockResolvedValue(1)
    const deleteWhere = jest.fn().mockReturnValue({ whereNot: deleteWhereNot })
    const sendVerificationEmail = jest.fn().mockResolvedValue()
    global.WIKI.models.users.query = () => ({
      where: () => ({
        first: jest.fn().mockResolvedValue({
          id: 7,
          email: 'user@example.com',
          isActive: true,
          isVerified: false
        })
      })
    })
    global.WIKI.models.users.sendVerificationEmail = sendVerificationEmail
    global.WIKI.models.userKeys = {
      query: () => ({
        delete: () => ({ where: deleteWhere })
      }),
      generateToken: jest.fn().mockResolvedValue('replacement-token'),
      destroyToken: jest.fn()
    }

    await User.loginResendVerification({ email: ' User@Example.com ' })

    expect(global.WIKI.models.userKeys.generateToken).toHaveBeenCalledWith({
      kind: 'verify',
      userId: 7
    })
    expect(sendVerificationEmail).toHaveBeenCalledWith({
      email: 'user@example.com',
      verificationToken: 'replacement-token'
    })
    expect(deleteWhere).toHaveBeenCalledWith({ userId: 7, kind: 'verify' })
    expect(deleteWhereNot).toHaveBeenCalledWith('token', 'replacement-token')
  })

  it('redirects local logout to the login screen without overriding provider logout', async () => {
    global.WIKI.config.auth = {
      autoLogin: true,
      redirectToLoginAfterLogout: true
    }
    global.WIKI.models.users.query = () => ({
      findById: () => ({
        select: jest.fn().mockResolvedValue({ providerKey: 'keycloak-instance' })
      })
    })
    global.WIKI.auth.strategies = {
      local: {
        key: 'keycloak-instance',
        config: {},
        logout: jest.fn().mockReturnValue('/')
      }
    }

    await expect(User.logout({ req: { user: { id: 7 } } })).resolves.toBe('/login?all=1')

    global.WIKI.auth.strategies.local.logout.mockReturnValue('https://idp.example.com/logout')
    await expect(User.logout({ req: { user: { id: 7 } } })).resolves.toBe('https://idp.example.com/logout')
  })
})
