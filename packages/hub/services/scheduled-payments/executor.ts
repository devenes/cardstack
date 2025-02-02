import * as Sentry from '@sentry/node';
import { inject } from '@cardstack/di';
import { ScheduledPayment } from '@prisma/client';
import { isBefore, subDays } from 'date-fns';
import shortUUID from 'short-uuid';
import { nowUtc } from '../../utils/dates';
import config from 'config';
import { Wallet } from 'ethers';
import { JsonRpcProvider, gasPriceInToken } from '@cardstack/cardpay-sdk';
import BN from 'bn.js';

export default class ScheduledPaymentsExecutorService {
  prismaManager = inject('prisma-manager', { as: 'prismaManager' });
  scheduledPaymentFetcher = inject('scheduled-payment-fetcher', { as: 'scheduledPaymentFetcher' });
  cardpay = inject('cardpay');
  workerClient = inject('worker-client', { as: 'workerClient' });
  crankNonceLock = inject('crank-nonce-lock', { as: 'crankNonceLock' });
  ethersProvider = inject('ethers-provider', { as: 'ethersProvider' });

  async getCurrentGasPrice(provider: JsonRpcProvider, gasTokenAddress: string) {
    // Wrapped in a method so that can be mocked in the tests
    return gasPriceInToken(provider, gasTokenAddress);
  }

  async executeScheduledPayments() {
    let scheduledPayments = await this.scheduledPaymentFetcher.fetchScheduledPayments();

    // Currently we do one by one, but we can do in parallel when we'll have a lot of scheduled payments
    for (let scheduledPayment of scheduledPayments) {
      try {
        // If this succeeds, it means that the scheduled payment transaction was submitted
        // and the ScheduledPaymentOnChainExecutionWaiter will wait for it to be mined in the background
        await this.executePayment(scheduledPayment);
      } catch (e) {
        Sentry.captureException(e);
        console.error(e);
        // Don't throw, continue to the next scheduled payment
      }
    }
  }

  async executePayment(scheduledPayment: ScheduledPayment) {
    let provider = this.ethersProvider.getInstance(scheduledPayment.chainId);
    let signer = new Wallet(config.get('hubPrivateKey'));
    let scheduledPaymentModule = await this.cardpay.getSDK('ScheduledPaymentModule', provider, signer);

    let prisma = await this.prismaManager.getClient();
    let paymentAttemptInProgress = await prisma.scheduledPaymentAttempt.findFirst({
      where: { scheduledPaymentId: scheduledPayment.id, status: 'inProgress' },
    });

    if (paymentAttemptInProgress) {
      throw new Error('Payment execution is already in progress');
    }

    if (scheduledPayment.recurringDayOfMonth) {
      let lastSuccessfulPaymentAttempt = await prisma.scheduledPaymentAttempt.findFirst({
        where: { scheduledPaymentId: scheduledPayment.id, status: 'succeeded' },
        orderBy: { endedAt: 'desc' },
      });

      // minDaysBetweenPayments is a very rough validation to prevent accidental duplicated execution of recurring payments
      // 28 days is the max number of days in a month, and validForDays is the retry period for failed payments.
      // For more accurate validation we rely on the scheduled payment module contract, which will revert with
      // InvalidPeriod if the payment is executed at the wrong time
      let minDaysBetweenPayments = 28 - this.scheduledPaymentFetcher.validForDays;
      if (
        lastSuccessfulPaymentAttempt &&
        !isBefore(lastSuccessfulPaymentAttempt.startedAt!, subDays(nowUtc(), minDaysBetweenPayments))
      ) {
        throw new Error(
          `Last payment was less than ${minDaysBetweenPayments} days ago. Looks like this scheduled payment is triggered too quickly.`
        );
      }
    }

    // Now that we know there is no payment attempt in progress, and that the payment is not too recent, we can create a new payment attempt
    let paymentAttempt = await prisma.scheduledPaymentAttempt.create({
      data: {
        id: shortUUID.uuid(),
        scheduledPaymentId: scheduledPayment.id,
        status: 'inProgress',
        startedAt: nowUtc(),
      },
    });

    let {
      moduleAddress,
      tokenAddress,
      amount,
      payeeAddress,
      feeFixedUsd,
      feePercentage,
      executionGasEstimation,
      maxGasPrice,
      gasTokenAddress,
      salt,
      payAt,
      recurringDayOfMonth,
      recurringUntil,
    } = scheduledPayment;

    let currentGasPrice = await this.getCurrentGasPrice(provider, gasTokenAddress);
    let executeScheduledPayment = (nonce: BN) => {
      return new Promise<string>((resolve, reject) => {
        scheduledPaymentModule
          .executeScheduledPayment(
            moduleAddress,
            tokenAddress,
            amount.toString(),
            payeeAddress,
            Number(feeFixedUsd),
            Number(feePercentage),
            Number(executionGasEstimation),
            String(maxGasPrice),
            gasTokenAddress,
            salt,
            String(currentGasPrice), // Contract will revert if this is larger than maxGasPrice
            payAt!.getTime() / 1000, // getTime returns milliseconds, but we want seconds, thus divide by 1000
            recurringDayOfMonth,
            recurringUntil ? recurringUntil.getTime() / 1000 : null,
            {
              onTxnHash: async (txnHash: string) => resolve(txnHash),
              nonce: nonce,
            }
          )
          .catch(async (error) => {
            reject(error);
          });
      });
    };
    try {
      let txnHash = await this.crankNonceLock.withNonce(scheduledPayment.chainId, executeScheduledPayment);
      await prisma.scheduledPaymentAttempt.update({
        data: {
          transactionHash: txnHash,
        },
        where: {
          id: paymentAttempt.id,
        },
      });
      await this.workerClient.addJob('scheduled-payment-on-chain-execution-waiter', {
        scheduledPaymentAttemptId: paymentAttempt.id,
      });
    } catch (error: any) {
      await prisma.scheduledPaymentAttempt.update({
        where: { id: paymentAttempt.id },
        data: {
          status: 'failed',
          endedAt: nowUtc(),
          failureReason: error.message,
        },
      });
      throw error;
    }
  }
}

declare module '@cardstack/di' {
  interface KnownServices {
    'scheduled-payment-executor': ScheduledPaymentsExecutorService;
  }
}
