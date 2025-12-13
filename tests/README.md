# Testing & Performance

This directory contains smoke tests and performance profiling tools for the Live Leaderboard application.

## Smoke Tests

Smoke tests verify that critical functionality is working correctly.

### Run Smoke Tests

```bash
# Default (localhost:3000)
node tests/smoke.test.mjs

# Custom base URL
BASE_URL=https://your-domain.com node tests/smoke.test.mjs
```

### What's Tested

- ✅ Homepage loads
- ✅ API endpoints respond correctly
- ✅ Event pages load
- ✅ Stage display accessible
- ✅ Judge console accessible
- ✅ SSE endpoint functional
- ✅ Performance benchmarks (<500ms for API, <1000ms for pages)

## Performance Profiling

Performance profiling measures response times and identifies bottlenecks.

### Run Performance Profile

```bash
# Basic profiling (10 iterations per endpoint)
node tests/performance-profile.mjs

# With load testing
node tests/performance-profile.mjs --load-test

# Custom base URL
BASE_URL=https://your-domain.com node tests/performance-profile.mjs
```

### Metrics Reported

- Average response time
- Min/Max response times
- P50, P95, P99 percentiles
- Throughput (requests/second) in load test mode

### Performance Targets

- **API Endpoints**: <500ms average
- **Page Loads**: <1000ms average
- **SSE Connection**: <200ms to establish

## Adding New Tests

### Add a Smoke Test

Edit `smoke.test.mjs` and add to the `tests` array:

```javascript
new SmokeTest('My test name', async () => {
  const response = await fetchWithTimeout(`${BASE_URL}/my-endpoint`);
  assert(response.ok, `Expected 200, got ${response.status}`);
  const data = await response.json();
  assert(data.someField, 'Expected someField to exist');
}),
```

### Add a Performance Test

Edit `performance-profile.mjs` and add a new metric:

```javascript
metrics.push(await measureEndpoint(
  `${BASE_URL}/my-endpoint`, 
  'My Endpoint Name'
));
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Smoke Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build
      - run: npm start &
      - run: sleep 10
      - run: node tests/smoke.test.mjs
```

### NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test:smoke": "node tests/smoke.test.mjs",
    "test:perf": "node tests/performance-profile.mjs",
    "test:load": "node tests/performance-profile.mjs --load-test"
  }
}
```

## Troubleshooting

### Tests Fail with Connection Errors

- Ensure the development server is running (`npm run dev`)
- Check the BASE_URL is correct
- Verify firewall/network settings

### Performance Tests Too Slow

- Check for database bottlenecks (add indexes)
- Verify SSE hub throttling is enabled
- Consider caching strategies for large datasets
- Profile with larger `ITERATIONS` value for more accurate results

### Load Test Overwhelming Server

- Reduce `concurrency` parameter
- Shorten `duration`
- Add rate limiting to API endpoints

## Best Practices

1. **Run smoke tests before deployment** - Catch regressions early
2. **Profile after major changes** - Identify performance impacts
3. **Set up monitoring** - Track metrics in production
4. **Regular load testing** - Ensure scalability for large events (100+ participants)
5. **Compare baselines** - Keep historical performance data

## Future Enhancements

- [ ] Integration tests with database fixtures
- [ ] End-to-end tests with Playwright
- [ ] Visual regression testing
- [ ] Automated lighthouse audits
- [ ] Real user monitoring (RUM) integration
