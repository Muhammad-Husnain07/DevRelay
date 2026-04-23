const autocannon = require('autocannon');

const runLoadTest = async (url, options, name) => {
  console.log(`\n[LoadTest] Starting: ${name}`);
  console.log(`         URL: ${url}`);

  const result = await autocannon({
    url,
    ...options
  });

  console.log(`\n[LoadTest] Results for ${name}:`);
  console.log(`  Requests: ${result.requests.total}`);
  console.log(`  Duration: ${result.duration}s`);
  console.log(`  Latency (p50): ${result.latency.p50}ms`);
  console.log(`  Latency (p95): ${result.latency.p95}ms`);
  console.log(`  Latency (p99): ${result.latency.p99}ms`);
  console.log(`  RPS: ${result.requests.mean}`;
  console.log(`  Errors: ${result.errors}`);
  console.log(`  Timeouts: ${result.timeouts}`);

  return result;
};

const runAllTests = async () => {
  console.log('DevRelay Load Test Suite');
  console.log('=====================');

  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

  await runLoadTest(`${baseUrl}/api/health`, {
    connections: 50,
    duration: 30,
    pipelining: 1
  }, 'Health Check (50 concurrent, 30s)');

  await runLoadTest(`${baseUrl}/api/ping`, {
    connections: 100,
    duration: 30,
    pipelining: 1
  }, 'Ping (100 concurrent, 30s)');

  console.log('\n[LoadTest] All tests completed');
};

if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runLoadTest, runAllTests };