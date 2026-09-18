/**
 * Payment provider entry point.
 *
 * Import from here, never from `./yoco` directly — see the reasoning on the
 * seam in `./provider`.
 */

import { yocoProvider } from "./yoco";
import type { PaymentProvider } from "./provider";

export function getPaymentProvider(): PaymentProvider {
  return yocoProvider;
}

export {
  DEFAULT_COMMISSION_BPS,
  splitCommission,
  toCents,
  centsToRand,
  type CommissionSplit,
} from "./commission";

export type {
  CreateCheckoutParams,
  PaymentProvider,
  PaymentProviderName,
  ProviderCheckout,
  ProviderRefund,
  ProviderResult,
  SignatureFailure,
  VerifySignatureInput,
  VerifySignatureResult,
} from "./provider";
