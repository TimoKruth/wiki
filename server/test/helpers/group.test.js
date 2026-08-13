const groupHelper = require('../../helpers/group')

describe('helpers/group external synchronization', () => {
  const groups = [
    { id: 1, name: 'Administrators', isSystem: true },
    { id: 3, name: 'Editors', isSystem: false },
    { id: 4, name: 'Reviewers', isSystem: false }
  ]

  it('normalizes external names and ignores invalid values', () => {
    expect(groupHelper.normalizeExternalGroupNames([' Editors ', '', null, 'Editors'])).toEqual(['Editors'])
  })

  it('preserves manual memberships and removes only stale memberships from the same provider', () => {
    expect(groupHelper.getExternalSyncPlan({
      groups,
      memberships: [
        { groupId: 3, source: null },
        { groupId: 4, source: 'auth:oidc-main' },
        { groupId: 7, source: 'auth:other' }
      ],
      groupNames: ['Editors'],
      source: 'auth:oidc-main'
    })).toMatchObject({
      expectedGroupIds: [3],
      groupIdsToAdd: [],
      groupIdsToRemove: [4]
    })
  })

  it('never maps or recreates system groups and reports genuinely missing groups', () => {
    expect(groupHelper.getExternalSyncPlan({
      groups,
      memberships: [],
      groupNames: ['Administrators', 'Authors'],
      source: 'auth:oidc-main'
    })).toEqual({
      missingGroupNames: ['Authors'],
      expectedGroupIds: [],
      groupIdsToAdd: [],
      groupIdsToRemove: []
    })
  })
})
