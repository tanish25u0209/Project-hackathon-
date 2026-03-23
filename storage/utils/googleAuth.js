'use strict';

const { google } = require('googleapis');

function getAuthClient() {
  const authMode = (process.env.GOOGLE_AUTH_MODE || 'auto').toLowerCase();

  const oauthClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const oauthClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const oauthRefreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  const oauthRedirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  const shouldUseOAuth =
    authMode === 'oauth2' ||
    (authMode === 'auto' && oauthClientId && oauthClientSecret && oauthRefreshToken);

  if (shouldUseOAuth) {
    if (!oauthClientId || !oauthClientSecret || !oauthRefreshToken) {
      throw new Error(
        'OAuth2 mode requires GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET and GOOGLE_OAUTH_REFRESH_TOKEN.'
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      oauthClientId,
      oauthClientSecret,
      oauthRedirectUri
    );

    oauth2Client.setCredentials({
      refresh_token: oauthRefreshToken,
    });

    return oauth2Client;
  }

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKeyRaw) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY in environment variables.');
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

module.exports = { getAuthClient };
