import { BigInt } from '@graphprotocol/graph-ts';
import { MerchantCreation as MerchantCreationEvent } from '../../generated/Merchant/MerchantManager';
import { MerchantRegistrationFee } from '../../generated/MerchantRegistrationFee/RegisterMerchantHandler';
import { Account, MerchantSafe, MerchantCreation, MerchantRegistrationPayment } from '../../generated/schema';
import { assertTransactionExists, makePrepaidCardPayment, toChecksumAddress } from '../utils';

export function handleMerchantCreation(event: MerchantCreationEvent): void {
  assertTransactionExists(event);

  let merchant = toChecksumAddress(event.params.merchant);
  let merchantSafe = toChecksumAddress(event.params.merchantSafe);
  let infoDID = event.params.infoDID;

  let accountEntity = new Account(merchant);
  accountEntity.save();

  let merchantSafeEntity = new MerchantSafe(merchantSafe);
  merchantSafeEntity.safe = merchantSafe;
  merchantSafeEntity.merchant = merchant;
  merchantSafeEntity.infoDid = infoDID;
  merchantSafeEntity.spendBalance = new BigInt(0);
  merchantSafeEntity.save();

  let creationEntity = new MerchantCreation(merchantSafe);
  creationEntity.transaction = event.transaction.hash.toHex();
  creationEntity.createdAt = event.block.timestamp;
  creationEntity.merchantSafe = merchantSafe;
  creationEntity.merchant = merchant;
  creationEntity.save();
}
export function handleMerchantRegistrationFee(event: MerchantRegistrationFee): void {
  assertTransactionExists(event);

  let txnHash = event.transaction.hash.toHex();
  let prepaidCard = toChecksumAddress(event.params.card);
  let issuingToken = toChecksumAddress(event.params.issuingToken);

  makePrepaidCardPayment(
    prepaidCard,
    txnHash,
    event.block.timestamp,
    null,
    issuingToken,
    event.params.issuingTokenAmount,
    event.params.spendAmount
  );

  let registrationFeeEntity = new MerchantRegistrationPayment(txnHash);
  registrationFeeEntity.transaction = txnHash;
  registrationFeeEntity.createdAt = event.block.timestamp;
  registrationFeeEntity.paidWith = prepaidCard;
  registrationFeeEntity.prepaidCardPayment = txnHash;
  registrationFeeEntity.issuingToken = issuingToken;
  registrationFeeEntity.issuingTokenAmount = event.params.issuingTokenAmount;
  registrationFeeEntity.spendAmount = event.params.spendAmount;
  registrationFeeEntity.save();
}