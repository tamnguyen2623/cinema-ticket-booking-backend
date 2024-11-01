const express = require('express')
const { googleCallback } = require('../controllers/authController')
const passport = require('passport');
const router = express.Router()

router.get(
    '/login/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })
  );
  router.get(
    '/login/oauth2/code/google',
    passport.authenticate('google', { failureRedirect: '/' , session: false}),
    googleCallback
  );

module.exports = router
