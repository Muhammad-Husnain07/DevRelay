const crypto = require('crypto');
const { verifySignature } = require('../src/services/signatureVerifier');

describe('signatureVerifier', () => {
  const secret = 'test-secret-key';
  const payload = { event: 'test.event', data: { message: 'hello' } };
  const payloadString = JSON.stringify(payload);

  describe('verifySignature', () => {
    test('validates correct SHA256 signature', () => {
      const signature = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
      const result = verifySignature(payloadString, `sha256=${signature}`, secret);
      expect(result).toBe(true);
    });

    test('rejects tampered payload', () => {
      const signature = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
      const result = verifySignature('{"tampered":true}', `sha256=${signature}`, secret);
      expect(result).toBe(false);
    });

    test('rejects wrong signature', () => {
      const result = verifySignature(payloadString, 'sha256=wrongsignature', secret);
      expect(result).toBe(false);
    });

    test('rejects invalid format', () => {
      const result = verifySignature(payloadString, 'invalid-format', secret);
      expect(result).toBe(false);
    });

    test('rejects missing signature', () => {
      const result = verifySignature(payloadString, '', secret);
      expect(result).toBe(false);
    });
  });
});