import test from 'node:test';
import assert from 'node:assert/strict';
import { newAccessToken, hashAccessToken, validSessionId, orderAccessState, ACCESS_WINDOW_MS, resolveDelivery } from '../lib/order-access.mjs';

test('purchase credentials have independent random secrets and reject malformed tokens', () => {
  const first = newAccessToken();
  assert.notEqual(first, newAccessToken());
  assert.match(hashAccessToken(first), /^[a-f0-9]{64}$/);
  assert.notEqual(hashAccessToken(first), first);
  for (const bad of [null, {}, '', 'x'.repeat(64), 'a'.repeat(63)]) assert.equal(hashAccessToken(bad), null);
  assert.equal(validSessionId('cs_test_1234567890'), true);
  assert.equal(validSessionId('../orders'), false);
});
test('only confirmed paid orders inside the access window are accessible', () => {
  const now = Date.now();
  assert.equal(orderAccessState(null, now), 'pending');
  assert.equal(orderAccessState({ payment_status: 'unpaid', created_at: now }, now), 'pending');
  assert.equal(orderAccessState({ payment_status: 'paid', created_at: now }, now), 'paid');
  assert.equal(orderAccessState({ payment_status: 'paid', created_at: now - ACCESS_WINDOW_MS }, now), 'expired');
  assert.equal(orderAccessState({ payment_status: 'paid', created_at: 'invalid' }, now), 'expired');
});
const files = [{ kind: 'audio', key: 'beat/mp3.mp3', name: 'Beat.mp3' }, { kind: 'license', key: 'beat/license.pdf', name: 'License.pdf' }];
const manifest = { beat: { 'MP3 Lease': { approved: true, files } } };
test('entitlements are an exact beat and tier mapping with an approved license', () => {
  assert.deepEqual(resolveDelivery(manifest, 'beat', 'MP3 Lease'), files);
  assert.equal(resolveDelivery(manifest, 'beat', 'Unlimited'), null);
  assert.equal(resolveDelivery(manifest, '__proto__', 'MP3 Lease'), null);
  assert.equal(resolveDelivery({ beat: { 'MP3 Lease': { approved: false, files } } }, 'beat', 'MP3 Lease'), null);
  assert.equal(resolveDelivery({ beat: { 'MP3 Lease': { approved: true, files: [files[0]] } } }, 'beat', 'MP3 Lease'), null);
});
test('invalid paths and unsafe download filenames fail closed', () => {
  for (const change of [{ key: '../secret' }, { name: 'bad"\r\nheader' }, { kind: 'other' }]) {
    assert.equal(resolveDelivery({ beat: { tier: { approved: true, files: [{ ...files[0], ...change }, files[1]] } } }, 'beat', 'tier'), null);
  }
});
