/* global __dirname, process, console, require, exports */
/* eslint @typescript-eslint/no-var-requires: "off" */

const { writeJSONSync, writeFileSync, readFileSync, removeSync, existsSync, ensureDirSync } = require('fs-extra');
const { join, resolve } = require('path');
const fetch = require('sync-fetch');
const { addFilePreamble } = require('./pre-tsc-build');

// This file runs before tsc compiles the rest of the mono repo so we need to
// get creative about how we load our data

const sourceAbiDir = resolve(join(__dirname, '..', '..', 'cardpay-sdk', 'contracts', 'abi', 'latest'));
const addressFile = resolve(join(__dirname, '..', '..', 'cardpay-sdk', 'contracts', 'addresses.ts'));
const abiDir = resolve(join(__dirname, '..', 'abis', 'generated'));
const subgraphTemplateFile = resolve(join(__dirname, '..', 'subgraph-template.yaml'));
const subgraphFile = resolve(join(__dirname, '..', 'subgraph.yaml'));
const generatedDir = join(__dirname, '..', 'src', 'generated');
const generatedAddresses = join(generatedDir, 'addresses.ts');

const network = process.argv.slice(2)[0];
if (!network) {
  console.error(`need to specify network`);
  process.exit(1);
}

let localChainAddresses;
if (network === 'localchain') {
  let localchainAddressesFile = resolve(join(__dirname, '..', 'localchain-addresses.json'));
  localChainAddresses = JSON.parse(readFileSync(localchainAddressesFile), { encoding: 'utf8' });
}

let cleanNetwork = network.replace('poa-', '');

// The graph-node configuration still references the gnosis chain as xdai
let legacyNetwork = network;
if (network == 'gnosis') {
  legacyNetwork = 'xdai';
}

// If there is a graphql endpoing provided
// take the latest deployed subgraph from it
// and use it as a base for grafting
const existing_subgraph = process.argv.slice(3)[0];

let graftingSection = "";
if (existing_subgraph) {
  console.log('Generating config to graft onto the latest deployment in subgraph:', existing_subgraph);
  let response = fetch(existing_subgraph, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query: `
      {
        _meta {
          deployment
          block {
            number
          }
        }
      }`,
      variables: {},
    }),
  });
  let meta = response.json().data?._meta;
  let latestDeployment = meta?.deployment;
  let latestBlock = meta?.block?.number;
  if (!latestDeployment || !latestBlock) {
    console.error('Could not find latest deployment in subgraph');
    process.exit(1);
  } else {
    console.log('Latest deployment:', latestDeployment);
    console.log('Latest block:', latestBlock);
    graftingSection = `
features:
  - grafting

graft:
  base: ${latestDeployment} # Subgraph ID of base subgraph
  block: ${latestBlock} # Block number
`;
  }
}

let cardpayGenesisBlock = {
  sokol: 27128523,
  gnosis: 17265698,
};
let tokenStartBlock = {
  sokol: 27129410, // the block that the token bridge was created (and hence our CPXD tokens)
  gnosis: cardpayGenesisBlock.gnosis,
};
let gnosisSafeGenesisBlock = {
  sokol: cardpayGenesisBlock.sokol,
  gnosis: cardpayGenesisBlock.gnosis,
};
let uniswapV2GenesisBlock = {
  sokol: 21474163,
  gnosis: cardpayGenesisBlock.gnosis,
};

let v0_7_0_startBlock = {
  sokol: 27128523,
  gnosis: 18457665,
};

let v0_8_0_startBlock = {
  sokol: 27128523,
  gnosis: 18457665,
};

let v0_8_3_startBlock = {
  sokol: 27128523,
  gnosis: 18457665,
};

let v0_8_4_startBlock = {
  sokol: 27128523,
  gnosis: 18855934,
};

let v0_8_5_startBlock = {
  sokol: 27128523,
  gnosis: 19003918,
};

let v0_8_6_startBlock = {
  sokol: 27128523,
  gnosis: 19375796,
};

let v0_8_7_startBlock = {
  sokol: 27128523,
  gnosis: 19375796,
};

let abis = {
  PrepaidCardManager: getAbi(join(sourceAbiDir, 'prepaid-card-manager.ts')),
  PrepaidCardMarket: getAbi(join(sourceAbiDir, 'prepaid-card-market.ts')),
  RevenuePool: getAbi(join(sourceAbiDir, 'revenue-pool.ts')),
  Spend: getAbi(join(sourceAbiDir, 'spend.ts')),
  PayMerchantHandler: getAbi(join(sourceAbiDir, 'pay-merchant-handler.ts')),
  RegisterMerchantHandler: getAbi(join(sourceAbiDir, 'register-merchant-handler.ts')),
  SplitPrepaidCardHandler: getAbi(join(sourceAbiDir, 'split-prepaid-card-handler.ts')),
  TransferPrepaidCardHandler: getAbi(join(sourceAbiDir, 'transfer-prepaid-card-handler.ts')),
  MerchantManager: getAbi(join(sourceAbiDir, 'merchant-manager.ts')),
  SupplierManager: getAbi(join(sourceAbiDir, 'supplier-manager.ts')),
  Exchange: getAbi(join(sourceAbiDir, 'exchange.ts')),
  DeprecatedMerchantManager_v0_6_7: getAbi(join(sourceAbiDir, 'deprecated-merchant-manager-0_6_7.ts')),
  RewardPool: getAbi(join(sourceAbiDir, 'reward-pool.ts')),
  RewardManager: getAbi(join(sourceAbiDir, 'reward-manager.ts')),
  RegisterRewardProgramHandler: getAbi(join(sourceAbiDir, 'register-reward-program-handler.ts')),
  RegisterRewardeeHandler: getAbi(join(sourceAbiDir, 'register-rewardee-handler.ts')),
};

removeSync(abiDir);
ensureDirSync(abiDir);
for (let [name, abi] of Object.entries(abis)) {
  if (!abi) {
    continue;
  }
  writeJSONSync(join(abiDir, `${name}.json`), abi, { spaces: 2 });
}

let subgraph = readFileSync(subgraphTemplateFile, { encoding: 'utf8' })
  .replace(/{LEGACY_NETWORK}/g, legacyNetwork)
  .replace(/{NETWORK}/g, cleanNetwork)
  .replace(/{GNOSIS_SAFE_PROXY_FACTORY_v1_2}/g, getAddress('gnosisProxyFactory_v1_2', cleanNetwork))
  .replace(/{GNOSIS_SAFE_PROXY_FACTORY_v1_3}/g, getAddress('gnosisProxyFactory_v1_3', cleanNetwork))
  .replace(/{PREPAID_CARD_MANAGER_ADDRESS}/g, getAddress('prepaidCardManager', cleanNetwork))
  .replace(/{PREPAID_CARD_MARKET_ADDRESS}/g, getAddress('prepaidCardMarket', cleanNetwork))
  .replace(/{UNISWAP_V2_FACTORY_ADDRESS}/g, getAddress('uniswapV2Factory', cleanNetwork))
  .replace(/{HOME_TOKEN_BRIDGE_ADDRESS}/g, getAddress('homeBridge', cleanNetwork))
  .replace(/{REVENUE_POOL_ADDRESS}/g, getAddress('revenuePool', cleanNetwork))
  .replace(/{EXCHANGE_ADDRESS}/g, getAddress('exchange', cleanNetwork))
  .replace(/{PAY_MERCHANT_HANDLER_ADDRESS}/g, getAddress('payMerchantHandler', cleanNetwork))
  .replace(/{REGISTER_MERCHANT_HANDLER_ADDRESS}/g, getAddress('registerMerchantHandler', cleanNetwork))
  .replace(/{SPLIT_PREPAID_CARD_HANDLER_ADDRESS}/g, getAddress('splitPrepaidCardHandler', cleanNetwork))
  .replace(/{TRANSFER_PREPAID_CARD_HANDLER_ADDRESS}/g, getAddress('transferPrepaidCardHandler', cleanNetwork))
  .replace(/{MERCHANT_MANAGER_ADDRESS}/g, getAddress('merchantManager', cleanNetwork))
  .replace(/{SUPPLIER_MANAGER_ADDRESS}/g, getAddress('supplierManager', cleanNetwork))
  .replace(/{SPEND_ADDRESS}/g, getAddress('spend', cleanNetwork))
  .replace(/{DAI_CPXD_ADDRESS}/g, getAddress('daiCpxd', cleanNetwork))
  .replace(/{CARD_CPXD_ADDRESS}/g, getAddress('cardCpxd', cleanNetwork))
  .replace(/{CARDPAY_GENESIS_BLOCK}/g, cardpayGenesisBlock[cleanNetwork])
  .replace(/{SAFE_GENESIS_BLOCK}/g, gnosisSafeGenesisBlock[cleanNetwork])
  .replace(/{UNISWAP_V2_GENESIS_BLOCK}/g, uniswapV2GenesisBlock[cleanNetwork])
  .replace(/{TOKEN_START_BLOCK}/g, tokenStartBlock[cleanNetwork])
  .replace(/{v0_7_0_START_BLOCK}/g, v0_7_0_startBlock[cleanNetwork])
  .replace(/{v0_8_0_START_BLOCK}/g, v0_8_0_startBlock[cleanNetwork])
  .replace(/{v0_8_3_START_BLOCK}/g, v0_8_3_startBlock[cleanNetwork])
  .replace(/{v0_8_4_START_BLOCK}/g, v0_8_4_startBlock[cleanNetwork])
  .replace(/{v0_8_5_START_BLOCK}/g, v0_8_5_startBlock[cleanNetwork])
  .replace(/{v0_8_6_START_BLOCK}/g, v0_8_6_startBlock[cleanNetwork])
  .replace(/{v0_8_7_START_BLOCK}/g, v0_8_7_startBlock[cleanNetwork])
  .replace(
    /{DEPRECATED_MERCHANT_MANAGER_v0_6_7_ADDRESS}/g,
    getAddress('deprecatedMerchantManager_v0_6_7', cleanNetwork)
  )
  .replace(/{REWARD_POOL_ADDRESS}/g, getAddress('rewardPool', cleanNetwork))
  .replace(/{REWARD_MANAGER_ADDRESS}/g, getAddress('rewardManager', cleanNetwork))
  .replace(/{REGISTER_REWARD_PROGRAM_HANDLER_ADDRESS}/g, getAddress('registerRewardProgramHandler', cleanNetwork))
  .replace(/{REGISTER_REWARDEE_HANDLER_ADDRESS}/g, getAddress('registerRewardeeHandler', cleanNetwork))
  .replace(/{GRAFTING}/g, graftingSection);

if (network === 'localchain') {
  subgraph = subgraph
    .replace(/startBlock: undefined/g, 'startBlock: 0')
    .replace('uniswap-factory-localchain', 'uniswap-factory-sokol'); // Not sure we need this for local chain, so we'll use the sokol one so we don't have to add local uniswap config
}

removeSync(subgraphFile);
writeFileSync(subgraphFile, subgraph);
ensureDirSync(generatedDir);
writeFileSync(
  generatedAddresses,
  `
/* This is an auto generated file, please do not edit this file */

export let addresses = new Map<string, string>();
addresses.set("prepaidCardManager", "${getAddress('prepaidCardManager', cleanNetwork)}");
addresses.set("relay", "${getAddress('relay', cleanNetwork)}");
addresses.set("revenuePool", "${getAddress('revenuePool', cleanNetwork)}");
`
);

addFilePreamble(
  subgraphFile,
  `### This is an auto generated file, please do not edit this file ###
### network: ${cleanNetwork}
`
);

function getAbi(path) {
  if (!existsSync(path)) {
    return;
  }
  let file = readFileSync(path, { encoding: 'utf8' })
    .replace(/^export default /, '')
    .replace('// mitigation for unexpected vs code debugger breakpoint', '')
    .replace('function noop() {}', '')
    .replace('noop();', '')
    .replace(/;$/, '');
  return eval(file);
}

function getAddress(contractName, network) {
  let file = readFileSync(addressFile, { encoding: 'utf8' });

  if (network === 'localchain') {
    return localChainAddresses[contractName];
  }

  let [, networkContents] = file.match(new RegExp(`${network.toUpperCase()} = {([^}]*)}`));
  let [, address] = networkContents.match(new RegExp(`${contractName}: ['"](\\w*)['"]`));
  return address;
}
