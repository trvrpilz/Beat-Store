import test from 'node:test';
import assert from 'node:assert/strict';
import { session, validSession, validFile } from '../lib/studio-auth.mjs';
const secret = 'a'.repeat(48);
test('owner sessions reject forged, expired and rotated credentials', () => {
  const token = session(secret, 1000);
  assert.equal(validSession(token, secret, 2000), true);
  assert.equal(validSession(token, 'b'.repeat(48), 2000), false);
  assert.equal(validSession(token + 'x', secret, 2000), false);
  assert.equal(validSession(token, secret, 30000000), false);
  assert.equal(validSession(token, '', 2000), false);
});
test('upload policy rejects active content, oversized and invalid files', () => {
  assert.equal(validFile('audio', 'track.wav', 1024), true);
  assert.equal(validFile('stems', 'track.zip', 250 * 1048576), true);
  assert.equal(validFile('artwork', 'image.svg', 100), false);
  assert.equal(validFile('audio', 'track.html', 100), false);
  assert.equal(validFile('artwork', 'image.png', 11 * 1048576), false);
  assert.equal(validFile('audio', 'track.wav', 0), false);
  assert.equal(validFile('stems', 'track.zip', 251 * 1048576), false);
  assert.equal(validFile('unknown', 'track.wav', 1024), false);
});
