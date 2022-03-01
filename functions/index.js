const functions = require("firebase-functions")
const admin = require('firebase-admin')
admin.initializeApp()

//DB reference
const dbRef = admin.firestore().doc('tokens/env')

const TwitterApi = require('twitter-api-v2').default;
const twitterClient = new TwitterApi({
  clientId: 'process.env.CLIENT_ID',
  clientSecret: 'process.env.CLIENT_SECRET',
})

const callbackUrl = 'http://localhost:5000/gpt3-twitter-bot/us-central1/callback'

// auth url
exports.auth = functions.https.onRequest((req, res) => {
    const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(
        callbackURL,
        { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] }
      );
      // store verifier
      await dbRef.set({ codeVerifier, state });
    
      response.redirect(url);
})

exports.callback = functions.https.onRequest((req, res) => {})

exports.tweet = functions.https.onRequest((req, res) => {})
 