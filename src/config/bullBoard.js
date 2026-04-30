// BullBoard disabled - BullMQ has adapter compatibility issues
// The actual queue workers (Webhook, Email, Scheduler, Job) are fully functional
// Queue monitoring is available via Dashboard and API endpoints

function setupBullBoard(app, authMiddleware) {
  // BullBoard requires Bull (legacy), but we use BullMQ (modern)
  // The queue workers are running and functional via workers/*
  console.log('[BullBoard] skipped: BullMQ adapter not compatible with @bull-board');
}

module.exports = { setupBullBoard };