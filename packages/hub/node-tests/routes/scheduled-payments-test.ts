import { PrismaClient } from '@prisma/client';
import { calculateNextPayAt } from '../../utils/scheduled-payments';
import { registry, setupHub } from '../helpers/server';
import { setupStubWorkerClient } from '../helpers/stub-worker-client';

class StubAuthenticationUtils {
  validateAuthToken(encryptedAuthToken: string) {
    return handleValidateAuthToken(encryptedAuthToken);
  }
}

let stubUserAddress = '0x2f58630CA445Ab1a6DE2Bb9892AA2e1d60876C13';
function handleValidateAuthToken(encryptedString: string) {
  expect(encryptedString).to.equal('abc123--def456--ghi789');
  return stubUserAddress;
}

describe('POST /api/scheduled-payments', async function () {
  this.beforeEach(async function () {
    registry(this).register('authentication-utils', StubAuthenticationUtils);
  });

  let { request } = setupHub(this);

  it('returns a 401 if the auth token is invalid', async function () {
    await request()
      .post('/api/scheduled-payments')
      .send({})
      .set('Accept', 'application/vnd.api+json')
      .set('Content-Type', 'application/vnd.api+json')
      .expect(401)
      .expect({
        errors: [
          {
            status: '401',
            title: 'No valid auth token',
          },
        ],
      })
      .expect('Content-Type', 'application/vnd.api+json');
  });

  it('responds with errors when attrs are missing', async function () {
    await request()
      .post('/api/scheduled-payments')
      .send({
        data: {
          type: 'scheduled-payments',
          attributes: {},
        },
      })
      .set('Accept', 'application/vnd.api+json')
      .set('Authorization', 'Bearer abc123--def456--ghi789')
      .set('Content-Type', 'application/vnd.api+json')
      .expect(422)
      .expect({
        errors: [
          {
            detail: 'sender safe address is required',
            source: {
              pointer: '/data/attributes/sender-safe-address',
            },
            status: '422',
            title: 'Invalid attribute',
          },
          {
            detail: 'module address is required',
            source: {
              pointer: '/data/attributes/module-address',
            },
            status: '422',
            title: 'Invalid attribute',
          },
          {
            detail: 'token address is required',
            source: {
              pointer: '/data/attributes/token-address',
            },
            status: '422',
            title: 'Invalid attribute',
          },
          {
            detail: 'amount is required',
            source: {
              pointer: '/data/attributes/amount',
            },
            status: '422',
            title: 'Invalid attribute',
          },
          {
            detail: 'payee address is required',
            source: {
              pointer: '/data/attributes/payee-address',
            },
            status: '422',
            title: 'Invalid attribute',
          },
          {
            detail: 'execution gas estimation is required',
            source: {
              pointer: '/data/attributes/execution-gas-estimation',
            },
            status: '422',
            title: 'Invalid attribute',
          },
          {
            detail: 'max gas price is required',
            source: {
              pointer: '/data/attributes/max-gas-price',
            },
            status: '422',
            title: 'Invalid attribute',
          },
          {
            detail: 'fee fixed usd is required',
            source: {
              pointer: '/data/attributes/fee-fixed-usd',
            },
            status: '422',
            title: 'Invalid attribute',
          },
          {
            detail: 'fee percentage is required',
            source: {
              pointer: '/data/attributes/fee-percentage',
            },
            status: '422',
            title: 'Invalid attribute',
          },
          {
            detail: 'salt is required',
            source: {
              pointer: '/data/attributes/salt',
            },
            status: '422',
            title: 'Invalid attribute',
          },
          {
            detail: 'pay at is required',
            source: {
              pointer: '/data/attributes/pay-at',
            },
            status: '422',
            title: 'Invalid attribute',
          },
          {
            detail: 'sp hash is required',
            source: {
              pointer: '/data/attributes/sp-hash',
            },
            status: '422',
            title: 'Invalid attribute',
          },
          {
            detail: 'chain id is required',
            source: {
              pointer: '/data/attributes/chain-id',
            },
            status: '422',
            title: 'Invalid attribute',
          },
          {
            detail: 'gas token address is required',
            source: {
              pointer: '/data/attributes/gas-token-address',
            },
            status: '422',
            title: 'Invalid attribute',
          },
        ],
      });
  });

  it('persists a one time scheduled payment', async function () {
    await request()
      .post('/api/scheduled-payments')
      .send({
        data: {
          type: 'scheduled-payments',
          attributes: {
            'sender-safe-address': '0xc0ffee254729296a45a3885639AC7E10F9d54979',
            'module-address': '0x7E7d0B97D663e268bB403eb4d72f7C0C7650a6dd',
            'token-address': '0xa455bbB2A81E09E0337c13326BBb302Cb37D7cf6',
            'gas-token-address': '0xa455bbB2A81E09E0337c13326BBb302Cb37D7cf6',
            amount: '10000000000000000000',
            'payee-address': '0x821f3Ee0FbE6D1aCDAC160b5d120390Fb8D2e9d3',
            'execution-gas-estimation': 100000,
            'max-gas-price': '1000000000',
            'fee-fixed-usd': 0,
            'fee-percentage': 0,
            salt: '54lt',
            'pay-at': '2021-01-01T00:00:00.000Z',
            'sp-hash': '0x123',
            'chain-id': 1,
            userAddress: stubUserAddress,
          },
        },
      })
      .set('Accept', 'application/vnd.api+json')
      .set('Authorization', 'Bearer abc123--def456--ghi789')
      .set('Content-Type', 'application/vnd.api+json')
      .expect(201)
      .expect(function (res) {
        res.body.data.id = 'id';
      })
      .expect({
        data: {
          id: 'id',
          type: 'scheduled-payment',
          attributes: {
            'sender-safe-address': '0xc0ffee254729296a45a3885639AC7E10F9d54979',
            'module-address': '0x7E7d0B97D663e268bB403eb4d72f7C0C7650a6dd',
            'token-address': '0xa455bbB2A81E09E0337c13326BBb302Cb37D7cf6',
            'gas-token-address': '0xa455bbB2A81E09E0337c13326BBb302Cb37D7cf6',
            amount: '10000000000000000000',
            'payee-address': '0x821f3Ee0FbE6D1aCDAC160b5d120390Fb8D2e9d3',
            'execution-gas-estimation': 100000,
            'max-gas-price': '1000000000',
            'fee-fixed-usd': '0',
            'fee-percentage': '0',
            salt: '54lt',
            'pay-at': '2021-01-01T00:00:00.000Z',
            'sp-hash': '0x123',
            'chain-id': 1,
            'user-address': stubUserAddress,
            'creation-transaction-hash': null,
            'creation-block-number': null,
            'creation-transaction-error': null,
            'cancelation-transaction-hash': null,
            'cancelation-block-number': null,
            'recurring-day-of-month': null,
            'recurring-until': null,
          },
        },
      })
      .expect('Content-Type', 'application/vnd.api+json');
  });

  it('persists a recurring scheduled payment', async function () {
    let calculatedPayAt = calculateNextPayAt(new Date(), 1);

    let responsePayAt: string;

    await request()
      .post('/api/scheduled-payments')
      .send({
        data: {
          type: 'scheduled-payments',
          attributes: {
            'sender-safe-address': '0xc0ffee254729296a45a3885639AC7E10F9d54979',
            'module-address': '0x7E7d0B97D663e268bB403eb4d72f7C0C7650a6dd',
            'token-address': '0xa455bbB2A81E09E0337c13326BBb302Cb37D7cf6',
            'gas-token-address': '0xa455bbB2A81E09E0337c13326BBb302Cb37D7cf6',
            amount: '100',
            'payee-address': '0x821f3Ee0FbE6D1aCDAC160b5d120390Fb8D2e9d3',
            'execution-gas-estimation': 100000,
            'max-gas-price': '1000000000',
            'fee-fixed-usd': 0,
            'fee-percentage': 0,
            salt: '54lt',
            'pay-at': null,
            'recurring-day-of-month': 1,
            'recurring-until': '2022-12-31T00:00:00.000Z',
            'sp-hash': '0x123',
            'chain-id': 1,
            userAddress: stubUserAddress,
          },
        },
      })
      .set('Accept', 'application/vnd.api+json')
      .set('Authorization', 'Bearer abc123--def456--ghi789')
      .set('Content-Type', 'application/vnd.api+json')
      .expect(201)
      .expect(function (res) {
        res.body.data.id = 'id';
        responsePayAt = res.body.data.attributes['pay-at'];
        res.body.data.attributes['pay-at'] = null; // pay_at from the response could be a off by at least a second due to async nature of the test, so we check for the acceptable delta later in then()
      })
      .expect({
        data: {
          id: 'id',
          type: 'scheduled-payment',
          attributes: {
            'sender-safe-address': '0xc0ffee254729296a45a3885639AC7E10F9d54979',
            'module-address': '0x7E7d0B97D663e268bB403eb4d72f7C0C7650a6dd',
            'token-address': '0xa455bbB2A81E09E0337c13326BBb302Cb37D7cf6',
            'gas-token-address': '0xa455bbB2A81E09E0337c13326BBb302Cb37D7cf6',
            amount: '100',
            'payee-address': '0x821f3Ee0FbE6D1aCDAC160b5d120390Fb8D2e9d3',
            'execution-gas-estimation': 100000,
            'max-gas-price': '1000000000',
            'fee-fixed-usd': '0',
            'fee-percentage': '0',
            salt: '54lt',
            'pay-at': null, // manipulated in response - we check it in then()
            'sp-hash': '0x123',
            'chain-id': 1,
            'user-address': stubUserAddress,
            'creation-transaction-hash': null,
            'creation-block-number': null,
            'creation-transaction-error': null,
            'cancelation-transaction-hash': null,
            'cancelation-block-number': null,
            'recurring-day-of-month': 1,
            'recurring-until': '2022-12-31T00:00:00.000Z',
          },
        },
      })
      .expect('Content-Type', 'application/vnd.api+json')
      .then(() => {
        let payAt = new Date(responsePayAt);
        let delta = Math.abs(payAt.getTime() - calculatedPayAt.getTime());
        expect(delta).to.be.lessThan(2000);
      });
  });
});

describe('GET /api/scheduled-payments/:id', async function () {
  let prisma: PrismaClient;

  this.beforeEach(async function () {
    registry(this).register('authentication-utils', StubAuthenticationUtils);
  });

  let { request, getContainer } = setupHub(this);

  this.beforeEach(async function () {
    let container = getContainer();
    prisma = await (await container.lookup('prisma-manager')).getClient();
  });

  it('returns a 401 if the auth token is invalid', async function () {
    await request()
      .get('/api/scheduled-payments/id')
      .set('Accept', 'application/vnd.api+json')
      .set('Content-Type', 'application/vnd.api+json')
      .expect(401)
      .expect({
        errors: [
          {
            status: '401',
            title: 'No valid auth token',
          },
        ],
      })
      .expect('Content-Type', 'application/vnd.api+json');
  });

  it('returns a scheduled payment', async function () {
    let scheduledPayment = await prisma.scheduledPayment.create({
      data: {
        id: '73994d4b-bb3a-4d73-969f-6fa24da16fb4',
        senderSafeAddress: '0xc0ffee254729296a45a3885639AC7E10F9d54979',
        moduleAddress: '0x7E7d0B97D663e268bB403eb4d72f7C0C7650a6dd',
        tokenAddress: '0xa455bbB2A81E09E0337c13326BBb302Cb37D7cf6',
        gasTokenAddress: '0x6A50E3807FB9cD0B07a79F64e561B9873D3b132E',
        amount: '100',
        payeeAddress: '0x821f3Ee0FbE6D1aCDAC160b5d120390Fb8D2e9d3',
        executionGasEstimation: 100000,
        maxGasPrice: '1000000000',
        feeFixedUsd: '0',
        feePercentage: '0',
        salt: '54lt',
        payAt: '2021-01-01T00:00:00.000Z',
        spHash: '0x123',
        chainId: 1,
        userAddress: stubUserAddress,
        creationTransactionHash: null,
      },
    });

    await request()
      .get(`/api/scheduled-payments/${scheduledPayment.id}`)
      .set('Authorization', 'Bearer abc123--def456--ghi789')
      .set('Accept', 'application/vnd.api+json')
      .set('Content-Type', 'application/vnd.api+json')
      .expect(200)
      .expect({
        data: {
          id: scheduledPayment.id,
          type: 'scheduled-payment',
          attributes: {
            'sender-safe-address': '0xc0ffee254729296a45a3885639AC7E10F9d54979',
            'module-address': '0x7E7d0B97D663e268bB403eb4d72f7C0C7650a6dd',
            'token-address': '0xa455bbB2A81E09E0337c13326BBb302Cb37D7cf6',
            'gas-token-address': '0x6A50E3807FB9cD0B07a79F64e561B9873D3b132E',
            amount: '100',
            'payee-address': '0x821f3Ee0FbE6D1aCDAC160b5d120390Fb8D2e9d3',
            'execution-gas-estimation': 100000,
            'max-gas-price': '1000000000',
            'fee-fixed-usd': '0',
            'fee-percentage': '0',
            salt: '54lt',
            'pay-at': '2021-01-01T00:00:00.000Z',
            'sp-hash': '0x123',
            'chain-id': 1,
            'user-address': stubUserAddress,
            'creation-transaction-hash': null,
            'creation-block-number': null,
            'creation-transaction-error': null,
            'cancelation-transaction-hash': null,
            'cancelation-block-number': null,
            'recurring-day-of-month': null,
            'recurring-until': null,
          },
        },
      })
      .expect('Content-Type', 'application/vnd.api+json');
  });
});

describe('PATCH /api/scheduled-payments/:id', async function () {
  let { getJobIdentifiers, getJobPayloads } = setupStubWorkerClient(this);
  let prisma: PrismaClient;

  this.beforeEach(async function () {
    registry(this).register('authentication-utils', StubAuthenticationUtils);
  });

  let { request, getContainer } = setupHub(this);

  this.beforeEach(async function () {
    let container = getContainer();
    prisma = await (await container.lookup('prisma-manager')).getClient();
  });

  it('returns a 401 if the auth token is invalid', async function () {
    await request()
      .patch('/api/scheduled-payments/id')
      .send({})
      .set('Accept', 'application/vnd.api+json')
      .set('Content-Type', 'application/vnd.api+json')
      .expect(401)
      .expect({
        errors: [
          {
            status: '401',
            title: 'No valid auth token',
          },
        ],
      })
      .expect('Content-Type', 'application/vnd.api+json');
  });

  it('updates a scheduled payment', async function () {
    let scheduledPayment = await prisma.scheduledPayment.create({
      data: {
        id: '73994d4b-bb3a-4d73-969f-6fa24da16fb4',
        senderSafeAddress: '0xc0ffee254729296a45a3885639AC7E10F9d54979',
        moduleAddress: '0x7E7d0B97D663e268bB403eb4d72f7C0C7650a6dd',
        tokenAddress: '0xa455bbB2A81E09E0337c13326BBb302Cb37D7cf6',
        gasTokenAddress: '0x6A50E3807FB9cD0B07a79F64e561B9873D3b132E',
        amount: '100',
        payeeAddress: '0x821f3Ee0FbE6D1aCDAC160b5d120390Fb8D2e9d3',
        executionGasEstimation: 100000,
        maxGasPrice: '1000000000',
        feeFixedUsd: 0,
        feePercentage: 0,
        salt: '54lt',
        payAt: '2021-01-01T00:00:00.000Z',
        spHash: '0x123',
        chainId: 1,
        userAddress: stubUserAddress,
        creationTransactionHash: null,
      },
    });

    await request()
      .patch(`/api/scheduled-payments/${scheduledPayment.id}`)
      .send({
        data: {
          attributes: {
            'creation-transaction-hash': '0x123',
          },
        },
      })
      .set('Accept', 'application/vnd.api+json')
      .set('Authorization', 'Bearer abc123--def456--ghi789')
      .set('Content-Type', 'application/vnd.api+json')
      .expect(200)
      .expect({
        data: {
          id: scheduledPayment.id,
          type: 'scheduled-payment',
          attributes: {
            'sender-safe-address': '0xc0ffee254729296a45a3885639AC7E10F9d54979',
            'module-address': '0x7E7d0B97D663e268bB403eb4d72f7C0C7650a6dd',
            'token-address': '0xa455bbB2A81E09E0337c13326BBb302Cb37D7cf6',
            'gas-token-address': '0x6A50E3807FB9cD0B07a79F64e561B9873D3b132E',
            amount: '100',
            'payee-address': '0x821f3Ee0FbE6D1aCDAC160b5d120390Fb8D2e9d3',
            'execution-gas-estimation': 100000,
            'max-gas-price': '1000000000',
            'fee-fixed-usd': '0',
            'fee-percentage': '0',
            salt: '54lt',
            'pay-at': '2021-01-01T00:00:00.000Z',
            'sp-hash': '0x123',
            'chain-id': 1,
            'user-address': stubUserAddress,
            'creation-transaction-hash': '0x123',
            'creation-block-number': null,
            'creation-transaction-error': null,
            'cancelation-transaction-hash': null,
            'cancelation-block-number': null,
            'recurring-day-of-month': null,
            'recurring-until': null,
          },
        },
      })
      .expect('Content-Type', 'application/vnd.api+json');

    expect(getJobIdentifiers()[0]).to.equal('scheduled-payment-on-chain-creation-waiter');
    expect(getJobPayloads()[0]).to.deep.equal({ scheduledPaymentId: scheduledPayment.id });
  });
});

describe('DELETE /api/scheduled-payments/:id', async function () {
  let prisma: PrismaClient;

  this.beforeEach(async function () {
    registry(this).register('authentication-utils', StubAuthenticationUtils);
  });

  let { request, getContainer } = setupHub(this);

  this.beforeEach(async function () {
    let container = getContainer();
    prisma = await (await container.lookup('prisma-manager')).getClient();
  });

  it('returns a 401 if the auth token is invalid', async function () {
    await request()
      .delete('/api/scheduled-payments/id')
      .set('Accept', 'application/vnd.api+json')
      .set('Content-Type', 'application/vnd.api+json')
      .expect(401)
      .expect({
        errors: [
          {
            status: '401',
            title: 'No valid auth token',
          },
        ],
      })
      .expect('Content-Type', 'application/vnd.api+json');
  });

  it('deletes a scheduled payment', async function () {
    let scheduledPayment = await prisma.scheduledPayment.create({
      data: {
        id: '73994d4b-bb3a-4d73-969f-6fa24da16fb4',
        senderSafeAddress: '0xc0ffee254729296a45a3885639AC7E10F9d54979',
        moduleAddress: '0x7E7d0B97D663e268bB403eb4d72f7C0C7650a6dd',
        tokenAddress: '0xa455bbB2A81E09E0337c13326BBb302Cb37D7cf6',
        gasTokenAddress: '0x6A50E3807FB9cD0B07a79F64e561B9873D3b132E',
        amount: '100',
        payeeAddress: '0x821f3Ee0FbE6D1aCDAC160b5d120390Fb8D2e9d3',
        executionGasEstimation: 100000,
        maxGasPrice: '1000000000',
        feeFixedUsd: 0,
        feePercentage: 0,
        salt: '54lt',
        payAt: '2021-01-01T00:00:00.000Z',
        spHash: '0x123',
        chainId: 1,
        userAddress: stubUserAddress,
        creationTransactionHash: null,
      },
    });

    await request()
      .delete(`/api/scheduled-payments/${scheduledPayment.id}`)

      .set('Accept', 'application/vnd.api+json')
      .set('Authorization', 'Bearer abc123--def456--ghi789')
      .set('Content-Type', 'application/vnd.api+json')
      .expect(200);

    expect(
      await prisma.scheduledPayment.findFirst({
        where: {
          id: scheduledPayment.id,
        },
      })
    ).to.be.null;
  });
});
