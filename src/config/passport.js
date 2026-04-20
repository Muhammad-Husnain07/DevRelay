const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');
const env = require('./env');

module.exports = function(passport) {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  if (!env.githubClientId || !env.githubClientSecret) {
    console.warn('[Passport] GitHub OAuth not configured - set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET');
    return;
  }

  passport.use(new GitHubStrategy({
    clientID: env.githubClientId,
    clientSecret: env.githubClientSecret,
    callbackURL: env.githubCallbackUrl
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ githubId: profile.id });

      if (user) {
        user.githubUsername = profile.username;
        user.avatar = profile.photos?.[0]?.value;
        user.lastLoginAt = new Date();
        await user.save();
        return done(null, user);
      }

      const email = profile.emails?.[0]?.value || `${profile.username}@github.local`;
      
      user = await User.findOne({ email });
      
      if (user) {
        user.githubId = profile.id;
        user.githubUsername = profile.username;
        user.avatar = profile.photos?.[0]?.value;
        user.lastLoginAt = new Date();
        await user.save();
        return done(null, user);
      }

      user = await User.create({
        name: profile.displayName || profile.username,
        email,
        githubId: profile.id,
        githubUsername: profile.username,
        avatar: profile.photos?.[0]?.value,
        lastLoginAt: new Date()
      });

      done(null, user);
    } catch (error) {
      console.error('GitHub OAuth error:', error);
      done(error, null);
    }
  }));
};