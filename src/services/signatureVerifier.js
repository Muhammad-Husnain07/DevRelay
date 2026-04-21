const crypto = require('crypto');
const _ = require('lodash');

function verifyGitHubSignature(payload, signature, secret) {
  if (!signature || !payload || !secret) {
    return false;
  }
  
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

function verifyStripeSignature(payload, signature, secret) {
  if (!signature || !payload || !secret) {
    return false;
  }
  
  const parts = signature.split(',');
  let timestamp = null;
  let expectedSig = null;
  
  for (const part of parts) {
    if (part.startsWith('t=')) {
      timestamp = parseInt(part.substring(2));
    } else if (part.startsWith('v1=')) {
      expectedSig = part.substring(3);
    }
  }
  
  if (!timestamp || !expectedSig) {
    return false;
  }
  
  const age = Math.floor(Date.now() / 1000) - timestamp;
  if (age > 300) {
    return false;
  }
  
  const signedPayload = timestamp + '.' + payload;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(signedPayload).digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSig),
    Buffer.from(digest)
  );
}

function verifyGenericHmac(payload, signature, secret, algorithm = 'sha256', format = 'hex', prefix = '') {
  if (!signature || !payload || !secret) {
    return false;
  }
  
  const normalizedSig = prefix ? signature.replace(new RegExp('^' + prefix), '') : signature;
  
  const algo = algorithm === 'sha1' ? 'sha1' 
    : algorithm === 'md5' ? 'md5' 
    : 'sha256';
  
  const hmac = crypto.createHmac(algo, secret);
  const computed = hmac.update(payload).digest(format);
  
  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(normalizedSig)
  );
}

async function verifyInboundWebhook(inbound, rawBody, headers) {
  if (!inbound.secret) {
    return { valid: true };
  }
  
  const bodyStr = rawBody instanceof Buffer 
    ? rawBody.toString('utf8') 
    : (typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody));
  
  const signatureHeader = inbound.signatureHeader?.toLowerCase() || 'x-hub-signature-256';
  const signature = headers[signatureHeader] || headers[signatureHeader.replace(/-/g, '_')];
  
  if (!signature) {
    return { valid: false, error: 'Missing signature header' };
  }
  
  const secret = inbound.secret;
  
  const [service] = detectService(inbound, signature);
  
  let valid = false;
  
  if (service === 'github' || signature.startsWith('sha256=')) {
    valid = verifyGitHubSignature(bodyStr, signature, secret);
  } else if (service === 'stripe' || signature.includes('t=')) {
    valid = verifyStripeSignature(bodyStr, signature, secret);
  } else {
    valid = verifyGenericHmac(
      bodyStr,
      signature,
      secret,
      inbound.signatureAlgorithm,
      inbound.signatureFormat,
      inbound.signaturePrefix
    );
  }
  
  return { valid, error: valid ? null : 'Invalid signature' };
}

function detectService(inbound, signature) {
  if (signature.startsWith('sha256=')) {
    return 'github';
  }
  if (signature.includes('t=') && signature.includes('v1=')) {
    return 'stripe';
  }
  return 'generic';
}

function extractEventType(inbound, payload) {
  try {
    const body = typeof payload === 'string' ? JSON.parse(payload) : payload;
    
    if (inbound.eventTypeField) {
      const eventType = _.get(body, inbound.eventTypeField);
      if (eventType) {
        return eventType;
      }
    }
    
    return inbound.defaultEventType || 'webhook.received';
  } catch {
    return inbound.defaultEventType || 'webhook.received';
  }
}

function transformPayload(script, payload) {
  if (!script) {
    return payload;
  }
  
  try {
    const body = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const fn = new Function('payload', 'return ' + script);
    return fn(body);
  } catch (error) {
    console.error('Transform script error:', error.message);
    return payload;
  }
}

module.exports = {
  verifyGitHubSignature,
  verifyStripeSignature,
  verifyGenericHmac,
  verifyInboundWebhook,
  extractEventType,
  transformPayload
};