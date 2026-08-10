const _ = require('lodash')

const LABEL_MAX_LENGTH = 255
const TARGET_MAX_LENGTH = 2048

module.exports = {
  LABEL_MAX_LENGTH,
  TARGET_MAX_LENGTH,

  /**
   * Validate navigation values before storing them in the site configuration.
   */
  validateTree(trees) {
    for (const tree of trees) {
      for (const item of tree.items) {
        if (['header', 'link'].includes(item.kind)) {
          if (!_.isString(item.label) || item.label.trim().length < 1) {
            throw new Error('Navigation link and header labels cannot be blank.')
          }
          if (item.label.length > LABEL_MAX_LENGTH) {
            throw new Error(`Navigation labels cannot exceed ${LABEL_MAX_LENGTH} characters.`)
          }
        }

        if (item.kind === 'link') {
          if (!_.isString(item.targetType) || item.targetType.length < 1) {
            throw new Error('Navigation links must define a target type.')
          }
          if (item.targetType !== 'home' && (!_.isString(item.target) || item.target.trim().length < 1)) {
            throw new Error('Navigation link targets cannot be blank.')
          }
          if (_.isString(item.target) && item.target.length > TARGET_MAX_LENGTH) {
            throw new Error(`Navigation link targets cannot exceed ${TARGET_MAX_LENGTH} characters.`)
          }
        }
      }
    }
    return true
  }
}
