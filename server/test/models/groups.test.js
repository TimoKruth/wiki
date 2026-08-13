const knexFactory = require('knex')
const Group = require('../../models/groups')
const migration = require('../../db/migrations-sqlite/2.5.315')

describe('models/groups external membership synchronization', () => {
  let db

  beforeEach(async () => {
    db = knexFactory({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true
    })
    await db.schema.createTable('userGroups', table => {
      table.increments('id').primary()
      table.integer('userId').notNullable()
      table.integer('groupId').notNullable()
    })
    await migration.up(db)

    global.WIKI = {
      auth: {
        reloadGroups: jest.fn(),
        revokeUserTokens: jest.fn()
      },
      data: {
        groups: {
          defaultPermissions: ['read:pages'],
          defaultPageRules: []
        }
      },
      events: {
        outbound: {
          emit: jest.fn()
        }
      },
      models: {
        groups: {},
        knex: db
      }
    }
  })

  afterEach(async () => {
    await db.destroy()
  })

  it('adds and rolls back provider source tracking', async () => {
    await expect(db('userGroups').columnInfo('source')).resolves.toMatchObject({ type: 'varchar' })
    await migration.down(db)
    await expect(db('userGroups').columnInfo()).resolves.not.toHaveProperty('source')
  })

  it('adds and removes only memberships managed by the active provider', async () => {
    await db('userGroups').insert([
      { userId: 9, groupId: 3, source: null },
      { userId: 9, groupId: 5, source: 'auth:oidc-main' },
      { userId: 9, groupId: 7, source: 'auth:other' }
    ])
    global.WIKI.models.groups.query = jest.fn().mockResolvedValue([
      { id: 1, name: 'Administrators', isSystem: true },
      { id: 3, name: 'Editors', isSystem: false },
      { id: 4, name: 'Reviewers', isSystem: false }
    ])

    const result = await Group.syncExternalMemberships({
      user: { id: 9 },
      providerKey: 'oidc-main',
      groupNames: ['Administrators', 'Editors', 'Reviewers']
    })

    expect(result).toEqual({
      createdGroups: [],
      addedGroups: [4],
      removedGroups: [5]
    })
    await expect(db('userGroups').select('groupId', 'source').where('userId', 9).orderBy('groupId')).resolves.toEqual([
      { groupId: 3, source: null },
      { groupId: 4, source: 'auth:oidc-main' },
      { groupId: 7, source: 'auth:other' }
    ])
    expect(global.WIKI.auth.revokeUserTokens).toHaveBeenCalledWith({ id: 9, kind: 'u' })
  })

  it('can create missing non-system groups with safe default permissions', async () => {
    const groups = [{ id: 1, name: 'Administrators', isSystem: true }]
    const insertAndFetch = jest.fn().mockResolvedValue({ id: 8, name: 'Authors', isSystem: false })
    global.WIKI.models.groups.query = jest.fn()
      .mockResolvedValueOnce(groups)
      .mockReturnValueOnce({ insertAndFetch })

    const result = await Group.syncExternalMemberships({
      user: { id: 9 },
      providerKey: 'ldap-main',
      groupNames: ['Administrators', 'Authors'],
      createMissingGroups: true
    })

    expect(insertAndFetch).toHaveBeenCalledWith({
      name: 'Authors',
      permissions: JSON.stringify(['read:pages']),
      pageRules: JSON.stringify([]),
      isSystem: false
    })
    expect(result.createdGroups).toEqual([8])
    expect(await db('userGroups').where({ userId: 9, groupId: 8 }).first()).toMatchObject({
      source: 'auth:ldap-main'
    })
    expect(global.WIKI.auth.reloadGroups).toHaveBeenCalled()
  })
})
