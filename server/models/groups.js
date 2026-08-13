const Model = require('objection').Model
const groupHelper = require('../helpers/group')

/* global WIKI */

/**
 * Groups model
 */
module.exports = class Group extends Model {
  static get tableName() { return 'groups' }

  static get jsonSchema () {
    return {
      type: 'object',
      required: ['name'],

      properties: {
        id: {type: 'integer'},
        name: {type: 'string'},
        isSystem: {type: 'boolean'},
        redirectOnLogin: {type: 'string'},
        createdAt: {type: 'string'},
        updatedAt: {type: 'string'}
      }
    }
  }

  static get jsonAttributes() {
    return ['permissions', 'pageRules']
  }

  static get relationMappings() {
    return {
      users: {
        relation: Model.ManyToManyRelation,
        modelClass: require('./users'),
        join: {
          from: 'groups.id',
          through: {
            from: 'userGroups.groupId',
            to: 'userGroups.userId'
          },
          to: 'users.id'
        }
      }
    }
  }

  $beforeUpdate() {
    this.updatedAt = new Date().toISOString()
  }
  $beforeInsert() {
    this.createdAt = new Date().toISOString()
    this.updatedAt = new Date().toISOString()
  }

  /**
   * Synchronize provider-managed memberships without removing manually
   * assigned or auto-enrollment groups.
   */
  static async syncExternalMemberships ({ user, providerKey, groupNames, createMissingGroups = false }) {
    const source = `auth:${providerKey}`
    let groups = await WIKI.models.groups.query()
    const memberships = await WIKI.models.knex('userGroups')
      .select('groupId', 'source')
      .where('userId', user.id)
    let plan = groupHelper.getExternalSyncPlan({ groups, memberships, groupNames, source })
    const createdGroups = []

    if (createMissingGroups) {
      for (const name of plan.missingGroupNames) {
        const group = await WIKI.models.groups.query().insertAndFetch({
          name,
          permissions: JSON.stringify(WIKI.data.groups.defaultPermissions),
          pageRules: JSON.stringify(WIKI.data.groups.defaultPageRules),
          isSystem: false
        })
        groups.push(group)
        createdGroups.push(group.id)
      }
      plan = groupHelper.getExternalSyncPlan({ groups, memberships, groupNames, source })
    }

    for (const groupId of plan.groupIdsToAdd) {
      await WIKI.models.knex('userGroups').insert({
        userId: user.id,
        groupId,
        source
      })
    }
    if (plan.groupIdsToRemove.length > 0) {
      await WIKI.models.knex('userGroups')
        .where({ userId: user.id, source })
        .whereIn('groupId', plan.groupIdsToRemove)
        .delete()
    }

    if (createdGroups.length > 0) {
      await WIKI.auth.reloadGroups()
      WIKI.events.outbound.emit('reloadGroups')
    }
    if (plan.groupIdsToAdd.length > 0 || plan.groupIdsToRemove.length > 0) {
      WIKI.auth.revokeUserTokens({ id: user.id, kind: 'u' })
      WIKI.events.outbound.emit('addAuthRevoke', { id: user.id, kind: 'u' })
    }

    return {
      createdGroups,
      addedGroups: plan.groupIdsToAdd,
      removedGroups: plan.groupIdsToRemove
    }
  }
}
