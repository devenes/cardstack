import { Server } from 'http';
import supertest, { Test } from 'supertest';
import { bootServerForTesting } from '../../main';
import { Registry } from '../../di/dependency-injection';

const stubNonce = 'abc:123';
let stubAuthToken = 'def--456';
let stubTimestamp = process.hrtime.bigint();

class StubAuthenticationUtils {
  generateNonce() {
    return stubNonce;
  }
  buildAuthToken() {
    return stubAuthToken;
  }
  extractVerifiedTimestamp(_nonce: string) {
    return stubTimestamp;
  }

  validateAuthToken(encryptedAuthToken: string) {
    return handleValidateAuthToken(encryptedAuthToken);
  }
}

let stubUserAddress = '0x2f58630CA445Ab1a6DE2Bb9892AA2e1d60876C13';
function handleValidateAuthToken(encryptedString: string) {
  expect(encryptedString).to.equal('abc123--def456--ghi789');
  return stubUserAddress;
}

describe('POST /api/merchant-infos', function () {
  let server: Server;
  let request: supertest.SuperTest<Test>;

  this.beforeEach(async function () {
    server = await bootServerForTesting({
      port: 3001,
      registryCallback(registry: Registry) {
        registry.register('authentication-utils', StubAuthenticationUtils);
      },
    });

    request = supertest(server);
  });

  this.afterEach(async function () {
    server.close();
  });

  it('persists merchant info', async function () {
    const payload = {
      data: {
        type: 'merchant-infos',
        attributes: {
          name: 'Satoshi Nakamoto',
          slug: 'satoshi',
          color: 'ff0000',
          'text-color': 'ffffff',
          'owner-address': '0x00000000000',
        },
      },
    };

    await request
      .post('/api/merchant-infos')
      .send(payload)
      .set('Authorization', 'Bearer: abc123--def456--ghi789')
      .set('Accept', 'application/vnd.api+json')
      .set('Content-Type', 'application/vnd.api+json')
      .expect(201)
      .expect(function (res) {
        res.body.data.id = 'the-id';
        res.body.data.attributes.did = 'the-did';
      })
      .expect({
        data: {
          type: 'merchant-infos',
          id: 'the-id',
          attributes: {
            name: 'Satoshi Nakamoto',
            slug: 'satoshi',
            did: 'the-did',
            color: 'ff0000',
            textColor: 'ffffff',
            ownerAddress: '0x2f58630CA445Ab1a6DE2Bb9892AA2e1d60876C13',
          },
        },
      })
      .expect('Content-Type', 'application/vnd.api+json');
  });

  it('returns 401 without bearer token', async function () {
    await request
      .post('/api/merchant-infos')
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
});