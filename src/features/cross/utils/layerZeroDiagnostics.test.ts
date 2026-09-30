import { it, expect } from 'vitest';
import { mapCrossApiError, layerZeroDiagnosticMessage } from './errors';
import { normalizeOfferSet } from '../model/quotes';

it('distinguishes provider quote failures and preserves diagnostics when other routes succeed', () => {
  for (const [code, expected] of [['unsupported_route', /does not support/i], ['timeout', /timed out/i], ['authentication_failed', /authentication/i], ['rate_limited', /rate.limit/i]]) {
    expect(mapCrossApiError({ status: 400, body: { error: 'No route available for this pair', providerDiagnostics: [{ provider: 'layerzero_value_transfer_api', code, message: 'upstream' }] } })).toMatch(expected);
  }
  const providerDiagnostics: any = [{ provider: 'layerzero_value_transfer_api', code: 'quote_rejected', message: 'Insufficient liquidity' }];
  const result = normalizeOfferSet({ offerSet: { offerSetId: 'other-route', expiresAt: 123, offers: [], providerDiagnostics } });
  expect(layerZeroDiagnosticMessage(result.providerDiagnostics)).toMatch(/Insufficient liquidity/);
});
