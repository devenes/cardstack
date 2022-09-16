import { Argv } from 'yargs';
import { getSDK } from '@cardstack/cardpay-sdk';
import { getEthereumClients, getConnectionType, NETWORK_OPTION_ANY } from '../utils';
import { Arguments, CommandModule } from 'yargs';

export default {
  command:
    'create-sp-hash <moduleAddress> <tokenAddress> <amount> <payeeAddress> <fixedUSDFee> <percentageFee> <executionGas> <maxGasPrice> <gasTokenAddress> <salt> <payAt>',
  describe:
    'Generates a scheduled payment hash which is calculated from the given arguments. The hash serves as a unique identifier used for scheduling, executing, and canceling scheduled payments',
  builder(yargs: Argv) {
    return yargs
      .positional('moduleAddress', {
        type: 'string',
        description: 'The address of scheduled payment module',
      })
      .positional('tokenAddress', {
        type: 'string',
        description: 'The address of the token being transferred',
      })
      .positional('amount', {
        type: 'string',
        description: 'Amount of tokens you would like transferred (in the smallest units of token)',
      })
      .positional('payeeAddress', {
        type: 'string',
        description: 'The address of the payee of scheduled payment',
      })
      .positional('fixedUSDFee', {
        type: 'number',
        description: 'Fixed USD fee (e.g. 0.25)',
      })
      .positional('percentageFee', {
        type: 'number',
        description: 'Percentage fee (e.g. 5%, 0.05)',
      })
      .positional('percentageFee', {
        type: 'number',
        description: 'Percentage fee (e.g. 5%, 0.05)',
      })
      .positional('executionGas', {
        type: 'number',
        description: 'The gas limit to execute scheduled payment',
      })
      .positional('maxGasPrice', {
        type: 'string',
        description: 'Maximum gas price (in the smallest units of gas token)',
      })
      .positional('gasTokenAddress', {
        type: 'string',
        description: 'The address of the gas token',
      })
      .positional('salt', {
        type: 'string',
        description: 'Arbitrary string to make SP unique',
      })
      .positional('payAt', {
        type: 'number',
        description: 'The unix UTC time in seconds from scheduled payment execution time',
      })
      .option('recurringDayOfMonth', {
        type: 'number',
        description: 'Day of the month on which the payment will be made recurringly (range: 1-28)',
      })
      .option('recurringUntil', {
        type: 'number',
        description: 'The unix UTC time in seconds from the end date of recurring payments',
      })
      .option('network', NETWORK_OPTION_ANY);
  },
  async handler(args: Arguments) {
    let {
      network,
      moduleAddress,
      tokenAddress,
      amount,
      payeeAddress,
      fixedUSDFee,
      percentageFee,
      executionGas,
      maxGasPrice,
      gasTokenAddress,
      salt,
      payAt,
      recurringDayOfMonth,
      recurringUntil,
    } = args as unknown as {
      network: string;
      moduleAddress: string;
      tokenAddress: string;
      amount: string;
      payeeAddress: string;
      fixedUSDFee: number;
      percentageFee: number;
      executionGas: number;
      maxGasPrice: string;
      gasTokenAddress: string;
      salt: string;
      payAt: number;
      recurringDayOfMonth: number;
      recurringUntil: number;
    };
    let { web3, signer } = await getEthereumClients(network, getConnectionType(args));
    let scheduledPaymentModule = await getSDK('ScheduledPaymentModule', web3, signer);

    console.log(`Create SP hash ...`);

    let spHash = await scheduledPaymentModule.createSpHash(
      moduleAddress,
      tokenAddress,
      amount,
      payeeAddress,
      {
        fixedUSD: fixedUSDFee,
        percentage: percentageFee,
      },
      executionGas,
      maxGasPrice,
      gasTokenAddress,
      salt,
      recurringDayOfMonth ? recurringDayOfMonth : payAt,
      recurringUntil
    );

    console.log(`SP Hash: ${spHash}`);
  },
} as CommandModule;