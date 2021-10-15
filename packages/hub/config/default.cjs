const defer = require('config/defer').deferConfig;
const { join } = require('path');

module.exports = {
  hubEnvironment: 'development',
  aws: {
    config: {
      credentials: {
        AccessKeyId: null,
        SecretAccessKey: null,
      },
      region: 'us-east-1',
    },
    offchainStorage: {
      bucketName: 'storage.cardstack.com',
      region: 'ap-southeast-1',
      roleChain: ['prod:storage-bucket-writer-role'],
    },
    accountId: '680542703984',
    prodAccountId: '120317779495',
  },
  db: {
    url: 'postgres://postgres:postgres@localhost:5432/hub_development',
    'migrations-dir': 'db/migrations',
    'migration-filename-format': 'utc',
    'ignore-pattern': 'README.md|.*\\.ts|.*\\.js\\.map',
  },
  serverSecret: null,
  sentry: {
    dsn: null,
    enabled: false,
    environment: null,
  },
  wyre: {
    accountId: null,
    apiKey: null,
    secretKey: null,
    callbackUrl: null,
    url: 'https://api.testwyre.com',
  },
  exchangeRates: {
    allowedDomains: ['https://wallet-staging.stack.cards', 'https://wallet.cardstack.com'],
    apiKey: null,
  },
  relay: {
    provisionerSecret: null,
  },
  web3: {
    network: 'sokol',
  },
  compiler: {
    realmsConfig: defer(function () {
      return [
        {
          url: 'https://cardstack.com/base/',
          directory: join(__dirname, '..', '..', 'base-cards'),
        },
        {
          url: 'https://demo.com/',
          directory: join(__dirname, '..', '..', 'demo-cards'),
        },
      ];
    }),
  },
};