const _ = require('lodash')

module.exports = {
  normalizeExternalGroupNames (groupNames = []) {
    const names = _.isArray(groupNames) ? groupNames : [groupNames]
    return _.uniq(names
      .filter(_.isString)
      .map(name => _.trim(name))
      .filter(name => name.length > 0 && name.length <= 255))
      .slice(0, 100)
  },

  getExternalSyncPlan ({ groups, memberships, groupNames, source }) {
    const normalizedNames = this.normalizeExternalGroupNames(groupNames)
    const allGroupsByName = _.keyBy(groups, group => group.name.toLowerCase())
    const availableGroupsByName = _.keyBy(_.reject(groups, 'isSystem'), group => group.name.toLowerCase())
    const expectedGroupIds = _.uniq(normalizedNames
      .map(name => {
        const group = availableGroupsByName[name.toLowerCase()]
        return group ? group.id : null
      })
      .filter(_.isSafeInteger))
    const currentGroupIds = _.uniq(memberships.map(membership => membership.groupId))

    return {
      missingGroupNames: normalizedNames.filter(name => !allGroupsByName[name.toLowerCase()]),
      expectedGroupIds,
      groupIdsToAdd: _.difference(expectedGroupIds, currentGroupIds),
      groupIdsToRemove: memberships
        .filter(membership => membership.source === source && !expectedGroupIds.includes(membership.groupId))
        .map(membership => membership.groupId)
    }
  }
}
