'use strict';

// Note that the SDK (which holds these constants) is a TS lib, so we can't
// require it in this CJS file.
const PAYMENT_UNIVERSAL_LINK_HOSTNAME = 'wallet.cardstack.com';
const PAYMENT_UNIVERSAL_LINK_STAGING_HOSTNAME = 'wallet-staging.stack.cards';

const universalLinkHostnamesByTarget = {
  staging: PAYMENT_UNIVERSAL_LINK_STAGING_HOSTNAME,
  production: PAYMENT_UNIVERSAL_LINK_HOSTNAME,
};

const PROFILE_LOCAL_DEV_HOSTNAME_SUFFIX = '.card.xyz.localhost';
const PROFILE_STAGING_HOSTNAME_SUFFIX = '.pouty.pizza';
const PROFILE_HOSTNAME_SUFFIX = '.card.xyz';

const profileHostnameSuffixByTarget = {
  staging: PROFILE_STAGING_HOSTNAME_SUFFIX,
  production: PROFILE_HOSTNAME_SUFFIX,
};

function convertHostnameSuffixToRegex(suffix) {
  // .pouty.pizza → /^.+\.pouty\.pizza$/
  return `/^.+${suffix.replace(/\./g, '\\.')}$/`;
}

const hostWhitelistByTarget = {
  staging: [
    PAYMENT_UNIVERSAL_LINK_STAGING_HOSTNAME,
    convertHostnameSuffixToRegex(PROFILE_STAGING_HOSTNAME_SUFFIX),
  ],
  production: [
    PAYMENT_UNIVERSAL_LINK_HOSTNAME,
    convertHostnameSuffixToRegex(PROFILE_HOSTNAME_SUFFIX),
  ],
};

const pkg = require('../package.json');

// eslint-disable-next-line no-undef
module.exports = function (environment) {
  let ENV = {
    modulePrefix: '@cardstack/ssr-web',
    environment,
    rootURL: '/',
    locationType: 'history',
    exportApplicationGlobal: true,
    hubURL: process.env.HUB_URL,
    previewSubdomainInfix: 'ssr-web-preview',
    universalLinkDomain:
      universalLinkHostnamesByTarget[process.env.SSR_WEB_ENVIRONMENT] ??
      PAYMENT_UNIVERSAL_LINK_STAGING_HOSTNAME,
    version: pkg.version,
    sentryDsn: process.env.SENTRY_DSN,
    '@sentry/ember': {
      sentry: {
        dsn: process.env.SENTRY_DSN,
        // debug: true, // uncomment this to get helpful logs about sentry's behavior
        enabled:
          environment === 'production' && process.env.SENTRY_DSN !== undefined,
        environment: process.env.SSR_WEB_ENVIRONMENT || 'development',
        release:
          `ssr-web${
            process.env.GITHUB_SHA ? `-${process.env.GITHUB_SHA}` : ''
          }@` + pkg.version,
        // Set tracesSampleRate to 1.0 to capture 100%
        // of transactions for performance monitoring.
        // We recommend adjusting this value in production,
        tracesSampleRate: 1.0,
      },
    },
    pageTitle: {
      separator: ' · ',
    },
    EmberENV: {
      FEATURES: {
        // Here you can enable experimental features on an ember canary build
        // e.g. EMBER_NATIVE_DECORATOR_SUPPORT: true
      },
    },

    APP: {
      // Here you can pass flags/options to your application instance
      // when it is created
    },
    urls: {
      about: 'https://cardstack.com/cardpay',
      appStoreLink:
        'https://apps.apple.com/us/app/card-wallet-by-cardstack/id1549183378',
      googlePlayLink:
        'https://play.google.com/store/apps/details?id=com.cardstack.cardpay',
      mailToSupportUrl: 'mailto:support@cardstack.com',
      statusPageBase: 'https://status.cardstack.com',
      statusPageUrl: 'https://status.cardstack.com/api/v2/summary.json',
      cardPayLink: 'https://cardstack.com/cardpay',
    },
    'ember-cli-mirage': {
      enabled: false,
    },
    fastboot: {
      hostWhitelist: hostWhitelistByTarget[process.env.SSR_WEB_ENVIRONMENT] ?? [
        '/.+.card.xyz.localhost:\\d+$/',
        '/^localhost:\\d+$/',
      ],
    },
    profileHostnameSuffix:
      profileHostnameSuffixByTarget[process.env.SSR_WEB_ENVIRONMENT] ??
      PROFILE_LOCAL_DEV_HOSTNAME_SUFFIX,
    chains: {
      layer2:
        process.env.SSR_WEB_ENVIRONMENT === 'production' ? 'gnosis' : 'sokol',
    },
  };

  if (
    process.env.SSR_WEB_ENVIRONMENT !== 'production' &&
    process.env.SSR_WEB_ENVIRONMENT !== 'staging' &&
    environment !== 'test'
  ) {
    // ENV.APP.LOG_RESOLVER = true;
    // ENV.APP.LOG_ACTIVE_GENERATION = true;
    // ENV.APP.LOG_TRANSITIONS = true;
    // ENV.APP.LOG_TRANSITIONS_INTERNAL = true;
    // ENV.APP.LOG_VIEW_LOOKUPS = true;
    ENV.hubURL = ENV.hubURL ?? 'http://localhost:3000';
  }

  if (environment === 'test') {
    // Testem prefers this...
    ENV.locationType = 'none';

    // thread animation interval > 0 means we might have to wait for css animations in tests
    ENV.threadAnimationInterval = 0;

    // keep test console output quieter
    ENV.APP.LOG_ACTIVE_GENERATION = false;
    ENV.APP.LOG_VIEW_LOOKUPS = false;

    ENV.APP.rootElement = '#ember-testing';
    ENV.APP.autoboot = false;

    // mock server during test
    ENV.hubURL = '';
    ENV['ember-cli-mirage'] = {
      enabled: true,
      trackRequests: true,
    };
    ENV.chains.layer2 = 'test';
  }

  if (environment === 'production') {
    // here you can enable a production-specific feature
  }

  return ENV;
};
