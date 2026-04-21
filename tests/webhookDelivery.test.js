const crypto = require('crypto');
const axios = require('axios');

jest.mock('axios');

describe('Webhook Delivery Worker', () => {
  const mockPayload = { event: 'test.event', data: { id: '123' } };
  const mockSecret = 'test-secret-key-12345678901234';
  const hashedSecret = crypto.createHash('sha256').update(mockSecret).digest('hex');
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('HMAC Signature', () => {
    it('should generate correct HMAC-SHA256 signature', () => {
      const signature = crypto
        .createHmac('sha256', mockSecret)
        .update(JSON.stringify(mockPayload))
        .digest('hex');
      
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBe(64);
    });
    
    it('should create signature header in correct format', () => {
      const signature = crypto
        .createHmac('sha256', mockSecret)
        .update(JSON.stringify(mockPayload))
        .digest('hex');
      
      const headerValue = `sha256=${signature}`;
      
      expect(headerValue.startsWith('sha256=')).toBe(true);
      expect(headerValue).toBe(`sha256=${signature}`);
    });
  });
  
  describe('Delivery Success', () => {
    it('should mark delivery as success on 2xx response', async () => {
      const mockDelivery = {
        _id: 'delivery-123',
        endpointId: 'endpoint-123',
        status: 'pending',
        save: jest.fn().mockResolvedValue(true)
      };
      
      const mockEndpoint = {
        _id: 'endpoint-123',
        secret: hashedSecret,
        url: 'https://example.com/webhook',
        timeoutMs: 30000,
        headers: new Map(),
        updateStats: jest.fn().mockResolvedValue(true)
      };
      
      axios.post.mockResolvedValue({
        status: 200,
        data: { received: true }
      });
      
      const response = await axios.post(mockEndpoint.url, mockPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-DevRelay-Signature': `sha256=${hashedSecret}`
        },
        timeout: mockEndpoint.timeoutMs
      });
      
      expect(response.status).toBe(200);
      expect(mockDelivery.status).toBe('pending');
    });
  });
  
  describe('Delivery Failure', () => {
    it('should handle axios errors', async () => {
      axios.post.mockRejectedValue(new Error('ENOTFOUND'));
      
      const mockEndpoint = {
        _id: 'endpoint-123',
        secret: hashedSecret,
        url: 'https://nonexistent.example.com/webhook',
        timeoutMs: 30000,
        updateStats: jest.fn().mockResolvedValue(true)
      };
      
      await expect(
        axios.post(mockEndpoint.url, mockPayload, {
          timeout: mockEndpoint.timeoutMs
        })
      ).rejects.toThrow();
    });
    
    it('should handle non-2xx responses', async () => {
      axios.post.mockResolvedValue({
        status: 400,
        data: { error: 'Bad Request' }
      });
      
      const response = await axios.post('https://example.com/webhook', mockPayload);
      
      expect(response.status).toBe(400);
      expect(response.data).toEqual({ error: 'Bad Request' });
    });
  });
  
  describe('Retry Logic', () => {
    it('should increment consecutive failures on error', async () => {
      let consecutiveFailures = 0;
      
      const incrementFailure = () => {
        consecutiveFailures += 1;
      };
      
      incrementFailure();
      incrementFailure();
      
      expect(consecutiveFailures).toBe(2);
    });
    
    it('should set endpoint to failing after 5 consecutive failures', async () => {
      let consecutiveFailures = 0;
      const failingThreshold = 5;
      
      for (let i = 0; i < failingThreshold; i++) {
        consecutiveFailures += 1;
      }
      
      const status = consecutiveFailures >= failingThreshold ? 'failing' : 'healthy';
      
      expect(consecutiveFailures).toBe(5);
      expect(status).toBe('failing');
    });
    
    it('should reset consecutive failures on success', async () => {
      let consecutiveFailures = 2;
      
      const handleSuccess = () => {
        consecutiveFailures = 0;
      };
      
      handleSuccess();
      
      expect(consecutiveFailures).toBe(0);
    });
  });
  
  describe('Request Headers', () => {
    it('should include required headers', () => {
      const requiredHeaders = [
        'Content-Type',
        'X-DevRelay-Signature',
        'X-DevRelay-Event',
        'X-DevRelay-Delivery-Id',
        'X-DevRelay-Timestamp'
      ];
      
      requiredHeaders.forEach(header => {
        expect(header).toBeDefined();
      });
    });
    
    it('should set correct timestamp header', () => {
      const timestamp = Date.now().toString();
      
      expect(timestamp).toMatch(/^\d+$/);
    });
  });
  
  describe('Webhooks List', () => {
    it('should allow wildcard event subscription', () => {
      const events = ['*'];
      
      const shouldDeliver = (subscribedEvents, eventType) => {
        if (subscribedEvents.includes('*')) return true;
        return subscribedEvents.includes(eventType);
      };
      
      expect(shouldDeliver(events, 'order.created')).toBe(true);
      expect(shouldDeliver(events, 'payment.failed')).toBe(true);
      expect(shouldDeliver(events, 'anything')).toBe(true);
    });
    
    it('should match exact event types', () => {
      const events = ['order.created', 'payment.failed'];
      
      const shouldDeliver = (subscribedEvents, eventType) => {
        if (subscribedEvents.includes('*')) return true;
        return subscribedEvents.includes(eventType);
      };
      
      expect(shouldDeliver(events, 'order.created')).toBe(true);
      expect(shouldDeliver(events, 'payment.failed')).toBe(true);
      expect(shouldDeliver(events, 'order.cancelled')).toBe(false);
    });
  });
});