const functions = require("firebase-functions")
const admin = require('firebase-admin')
admin.initializeApp()

//DB reference
const dbRef = admin.firestore().doc('tokens/env')


//twitter api init
const TwitterApi = require('twitter-api-v2').default;
const twitterClient = new TwitterApi({
  clientId: 'process.env.CLIENT_ID',
  clientSecret: 'process.env.CLIENT_SECRET',
})

const callbackURL = 'http://localhost:5000/gpt3-twitter-bot/us-central1/callback'


//openai api init
const { Configuration, OpenAIApi } = require('openai');
const configuration = new Configuration({
  organization: 'process.env.ORGANIZATION',
  apiKey: 'process.env.API_SECRET',
});
const openai = new OpenAIApi(configuration);

// auth url
exports.auth = functions.https.onRequest((req, res) => {
    const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(
        callbackURL,
        { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] }
      );
      // store verifier
      await dbRef.set({ codeVerifier, state })
    
      res.redirect(url)
})

exports.callback = functions.https.onRequest((req, res) => {
    const { state, code } = req.query

  const dbSnapshot = await dbRef.get()
  const { codeVerifier, state: storedState } = dbSnapshot.data()

  if (state !== storedState) {
    return res.status(400).send('Stored tokens do not match!')
  }

  const {
    client: loggedClient,
    accessToken,
    refreshToken,
  } = await twitterClient.loginWithOAuth2({
    code,
    codeVerifier,
    redirectUri: callbackURL,
  });

  await dbRef.set({ accessToken, refreshToken })

  const { data } = await loggedClient.v2.me()

  res.send(data)
})

exports.tweet = functions.https.onRequest((req, res) => {
    const { refreshToken } = (await dbRef.get()).data()

  const {
    client: refreshedClient,
    accessToken,
    refreshToken: newRefreshToken,
  } = await twitterClient.refreshOAuth2Token(refreshToken)

  await dbRef.set({ accessToken, refreshToken: newRefreshToken })

  const nextTweet = await openai.createCompletion('text-davinci-001', {
    prompt: 'random tweet for #techtwitter',
    max_tokens: 64,
  })

  const { data } = await refreshedClient.v2.tweet(
    nextTweet.data.choices[0].text
  )

  res.send(data)
})
 