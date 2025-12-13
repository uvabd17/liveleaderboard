/**
 * Performance Profiling Tool
 * Measures and reports performance metrics for key endpoints
 * 
 * Usage: node tests/performance-profile.mjs
 */

import { performance } from 'perf_hooks';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_EVENT_SLUG = 'demo-event';
const ITERATIONS = 10;

class PerformanceMetric {
  constructor(name) {
    this.name = name;
    this.measurements = [];
  }

  record(duration) {
    this.measurements.push(duration);
  }

  get average() {
    return this.measurements.reduce((a, b) => a + b, 0) / this.measurements.length;
  }

  get min() {
    return Math.min(...this.measurements);
  }

  get max() {
    return Math.max(...this.measurements);
  }

  get p50() {
    const sorted = [...this.measurements].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.5)];
  }

  get p95() {
    const sorted = [...this.measurements].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.95)];
  }

  get p99() {
    const sorted = [...this.measurements].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.99)];
  }

  report() {
    console.log(`\n📊 ${this.name}`);
    console.log(`   Average:  ${this.average.toFixed(2)}ms`);
    console.log(`   Min:      ${this.min.toFixed(2)}ms`);
    console.log(`   Max:      ${this.max.toFixed(2)}ms`);
    console.log(`   P50:      ${this.p50.toFixed(2)}ms`);
    console.log(`   P95:      ${this.p95.toFixed(2)}ms`);
    console.log(`   P99:      ${this.p99.toFixed(2)}ms`);
  }
}

async function measureEndpoint(url, name, iterations = ITERATIONS) {
  const metric = new PerformanceMetric(name);
  
  console.log(`Testing ${name}... (${iterations} iterations)`);
  
  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    try {
      const response = await fetch(url);
      await response.text(); // Ensure full response is received
      const duration = performance.now() - startTime;
      metric.record(duration);
    } catch (error) {
      console.error(`   Error on iteration ${i + 1}:`, error.message);
    }
  }
  
  return metric;
}

async function profileAPI() {
  console.log('\n🔬 Performance Profiling\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Iterations: ${ITERATIONS}\n`);

  const metrics = [];

  // Profile key endpoints
  metrics.push(await measureEndpoint(`${BASE_URL}/`, 'Homepage'));
  metrics.push(await measureEndpoint(`${BASE_URL}/api/events`, 'API: List Events'));
  metrics.push(await measureEndpoint(`${BASE_URL}/api/events/${TEST_EVENT_SLUG}/leaderboard`, 'API: Leaderboard'));
  metrics.push(await measureEndpoint(`${BASE_URL}/api/scoring-schema?eventSlug=${TEST_EVENT_SLUG}`, 'API: Scoring Schema'));
  metrics.push(await measureEndpoint(`${BASE_URL}/e/${TEST_EVENT_SLUG}`, 'Event Page'));
  metrics.push(await measureEndpoint(`${BASE_URL}/e/${TEST_EVENT_SLUG}/stage`, 'Stage Display'));

  // Report all metrics
  console.log('\n' + '='.repeat(60));
  console.log('\n📈 Performance Report\n');
  metrics.forEach(metric => metric.report());

  // Overall statistics
  const allMeasurements = metrics.flatMap(m => m.measurements);
  const overallAvg = allMeasurements.reduce((a, b) => a + b, 0) / allMeasurements.length;
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n🎯 Overall Average: ${overallAvg.toFixed(2)}ms\n`);

  // Identify slow endpoints (>500ms average)
  const slowEndpoints = metrics.filter(m => m.average > 500);
  if (slowEndpoints.length > 0) {
    console.log('⚠️  Slow Endpoints (avg >500ms):');
    slowEndpoints.forEach(m => {
      console.log(`   - ${m.name}: ${m.average.toFixed(2)}ms`);
    });
  } else {
    console.log('✅ All endpoints performing well (<500ms avg)\n');
  }
}

// Load testing simulation
async function loadTest(url, concurrency = 10, duration = 5000) {
  console.log(`\n🔥 Load Test: ${url}`);
  console.log(`   Concurrency: ${concurrency}`);
  console.log(`   Duration: ${duration}ms\n`);

  const startTime = Date.now();
  const requests = [];
  let successCount = 0;
  let errorCount = 0;
  const durations = [];

  while (Date.now() - startTime < duration) {
    const batch = Array(concurrency).fill(null).map(async () => {
      const reqStart = performance.now();
      try {
        const response = await fetch(url);
        await response.text();
        const reqDuration = performance.now() - reqStart;
        durations.push(reqDuration);
        successCount++;
      } catch (error) {
        errorCount++;
      }
    });

    await Promise.allSettled(batch);
  }

  const totalTime = Date.now() - startTime;
  const totalRequests = successCount + errorCount;
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const requestsPerSec = (totalRequests / totalTime) * 1000;

  console.log(`   Total Requests: ${totalRequests}`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Failed: ${errorCount}`);
  console.log(`   Avg Duration: ${avgDuration.toFixed(2)}ms`);
  console.log(`   Throughput: ${requestsPerSec.toFixed(2)} req/s\n`);
}

// Run profiling
async function main() {
  await profileAPI();
  
  // Optional: Run load test
  const runLoadTest = process.argv.includes('--load-test');
  if (runLoadTest) {
    console.log('\n' + '='.repeat(60));
    await loadTest(`${BASE_URL}/api/events/${TEST_EVENT_SLUG}/leaderboard`);
  } else {
    console.log('\nℹ️  Run with --load-test to include load testing\n');
  }
}

main().catch(error => {
  console.error('\n💥 Profiling crashed:', error);
  process.exit(1);
});
