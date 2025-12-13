/**
 * Smoke Tests for Live Leaderboard
 * Run these tests to verify critical functionality
 * 
 * Usage: node tests/smoke.test.mjs
 */

import { performance } from 'perf_hooks';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_EVENT_SLUG = 'demo-event';

class SmokeTest {
  constructor(name, testFn) {
    this.name = name;
    this.testFn = testFn;
  }

  async run() {
    const startTime = performance.now();
    try {
      await this.testFn();
      const duration = performance.now() - startTime;
      console.log(`✅ ${this.name} (${duration.toFixed(2)}ms)`);
      return { passed: true, duration, name: this.name };
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ ${this.name} (${duration.toFixed(2)}ms)`);
      console.error(`   Error: ${error.message}`);
      return { passed: false, duration, name: this.name, error: error.message };
    }
  }
}

// Test utilities
async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Define smoke tests
const tests = [
  new SmokeTest('Homepage loads', async () => {
    const response = await fetchWithTimeout(`${BASE_URL}/`);
    assert(response.ok, `Expected 200, got ${response.status}`);
    const html = await response.text();
    assert(html.length > 0, 'Empty response');
  }),

  new SmokeTest('API: Get events', async () => {
    const response = await fetchWithTimeout(`${BASE_URL}/api/events`);
    assert(response.ok, `Expected 200, got ${response.status}`);
    const data = await response.json();
    assert(Array.isArray(data.events), 'Expected events array');
  }),

  new SmokeTest('API: Get event leaderboard', async () => {
    const response = await fetchWithTimeout(`${BASE_URL}/api/events/${TEST_EVENT_SLUG}/leaderboard`);
    assert(response.ok || response.status === 404, `Expected 200 or 404, got ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      assert(data.event, 'Expected event object');
      assert(Array.isArray(data.participants), 'Expected participants array');
    }
  }),

  new SmokeTest('API: Get scoring schema', async () => {
    const response = await fetchWithTimeout(`${BASE_URL}/api/scoring-schema?eventSlug=${TEST_EVENT_SLUG}`);
    assert(response.ok || response.status === 404, `Expected 200 or 404, got ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      assert(Array.isArray(data.rubric) || data.rubric === null, 'Expected rubric array or null');
    }
  }),

  new SmokeTest('Event page loads', async () => {
    const response = await fetchWithTimeout(`${BASE_URL}/e/${TEST_EVENT_SLUG}`);
    assert(response.ok || response.status === 404, `Expected 200 or 404, got ${response.status}`);
  }),

  new SmokeTest('Stage display loads', async () => {
    const response = await fetchWithTimeout(`${BASE_URL}/e/${TEST_EVENT_SLUG}/stage`);
    assert(response.ok || response.status === 404, `Expected 200 or 404, got ${response.status}`);
  }),

  new SmokeTest('Judge page loads', async () => {
    const response = await fetchWithTimeout(`${BASE_URL}/e/${TEST_EVENT_SLUG}/judge`);
    assert(response.ok || response.status === 302, `Expected 200 or 302, got ${response.status}`);
  }),

  new SmokeTest('SSE endpoint accessible', async () => {
    const response = await fetchWithTimeout(`${BASE_URL}/api/sse?eventSlug=${TEST_EVENT_SLUG}`, {}, 2000);
    assert(response.ok, `Expected 200, got ${response.status}`);
    assert(response.headers.get('content-type')?.includes('text/event-stream'), 'Expected SSE content-type');
  }),
];

// Performance benchmarks
const perfTests = [
  new SmokeTest('PERF: Leaderboard API < 500ms', async () => {
    const startTime = performance.now();
    const response = await fetchWithTimeout(`${BASE_URL}/api/events/${TEST_EVENT_SLUG}/leaderboard`);
    const duration = performance.now() - startTime;
    assert(response.ok || response.status === 404, `Expected 200 or 404, got ${response.status}`);
    assert(duration < 500, `Too slow: ${duration.toFixed(2)}ms (expected < 500ms)`);
  }),

  new SmokeTest('PERF: Event page < 1000ms', async () => {
    const startTime = performance.now();
    const response = await fetchWithTimeout(`${BASE_URL}/e/${TEST_EVENT_SLUG}`);
    const duration = performance.now() - startTime;
    assert(response.ok || response.status === 404, `Expected 200 or 404, got ${response.status}`);
    assert(duration < 1000, `Too slow: ${duration.toFixed(2)}ms (expected < 1000ms)`);
  }),
];

// Run all tests
async function runTests() {
  console.log('\n🧪 Running Smoke Tests...\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test Event: ${TEST_EVENT_SLUG}\n`);

  const allTests = [...tests, ...perfTests];
  const results = [];

  for (const test of allTests) {
    const result = await test.run();
    results.push(result);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  console.log(`\n📊 Summary:`);
  console.log(`   Total: ${results.length}`);
  console.log(`   Passed: ${passed} ✅`);
  console.log(`   Failed: ${failed} ❌`);
  console.log(`   Average Duration: ${avgDuration.toFixed(2)}ms`);

  if (failed > 0) {
    console.log('\n⚠️  Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✨ All tests passed!\n');
    process.exit(0);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    console.error('\n💥 Test runner crashed:', error);
    process.exit(1);
  });
}

export { SmokeTest, runTests };
