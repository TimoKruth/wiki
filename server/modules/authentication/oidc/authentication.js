const _ = require('lodash')

/* global WIKI */

// ------------------------------------
// OpenID Connect Account
// ------------------------------------

const OpenIDConnectStrategy = require('passport-openidconnect').Strategy

module.exports = {
  init (passport, conf) {
    passport.use(conf.key,
      new OpenIDConnectStrategy({
        authorizationURL: conf.authorizationURL,
        tokenURL: conf.tokenURL,
        clientID: conf.clientId,
        clientSecret: conf.clientSecret,
        issuer: conf.issuer,
        userInfoURL: conf.userInfoURL,
        callbackURL: conf.callbackURL,
        passReqToCallback: true,
        skipUserProfile: conf.skipUserProfile,
        acrValues: conf.acrValues
      }, async (req, iss, uiProfile, idProfile, context, idToken, accessToken, refreshToken, params, cb) => {
        const profile = Object.assign({}, idProfile, uiProfile)
        const picture = _.get(profile, '_json.' + conf.pictureClaim, '')

        try {
          const user = await WIKI.models.users.processProfile({
            providerKey: req.params.strategy,
            profile: {
              ...profile,
              email: _.get(profile, '_json.' + conf.emailClaim),
              displayName: _.get(profile, '_json.' + conf.displayNameClaim, ''),
              picture: picture
            }
          })
          if (conf.mapGroups) {
            const groups = _.get(profile, '_json.' + conf.groupsClaim)
            if (!_.isNil(groups)) {
              await WIKI.models.groups.syncExternalMemberships({
                user,
                providerKey: req.params.strategy,
                groupNames: groups,
                createMissingGroups: conf.createMissingGroups
              })
            }
          }
          cb(null, user)
        } catch (err) {
          cb(err, null)
        }
      })
    )
  },
  logout (conf) {
    if (!conf.logoutURL) {
      return '/'
    } else {
      return conf.logoutURL
    }
  }
}
