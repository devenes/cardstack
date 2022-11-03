/* eslint-disable node/no-unsupported-features/es-syntax */
import { ScheduledPaymentModuleSetup } from '../generated/ScheduledPaymentModule/ScheduledPaymentModule';
import { Safe } from '../generated/schema';

export function handleScheduledPaymentModuleSetup(event: ScheduledPaymentModuleSetup): void {
  let safe = new Safe(event.params.owner.toHex());
  safe.owner = event.transaction.from;
  safe.spModule = event.params.moduleAddress;
  safe.save();
}
