import { parseEmails } from '../utils/csvParser';
import { RateLimiterService } from '../services/rateLimiter';
import { prisma } from '../config/db';
import { redis } from '../config/redis';

/**
 * Custom Unit Test Runner
 */
async function runTests() {
  console.log('\n🧪 Starting ReachInbox Scheduler Test Suite...\n');
  let passed = 0;
  let failed = 0;

  const run = async (name: string, fn: () => Promise<void> | void) => {
    try {
      console.log(`🏃 Running test: ${name}`);
      await fn();
      console.log(`✅ Passed: ${name}\n`);
      passed++;
    } catch (err: any) {
      console.error(`❌ Failed: ${name}`);
      console.error(err);
      console.log();
      failed++;
    }
  };

  // Test 1: CSV Parser (Pure unit test, always runs)
  await run('CSV/TXT Email Parser & Deduplicator', () => {
    const rawContent = `
      test1@example.com, test2@example.com;
      invalid-email-format
      test1@example.com
      TEST2@EXAMPLE.COM
      another.valid+email@sub.domain.co
    `;

    const result = parseEmails(rawContent);

    if (result.totalDetected !== 6) {
      throw new Error(`Expected 6 total detected tokens, got ${result.totalDetected}`);
    }

    if (result.validEmails.length !== 3) {
      throw new Error(`Expected 3 unique valid emails, got ${result.validEmails.length}`);
    }

    if (result.invalidEmails.length !== 1) {
      throw new Error(`Expected 1 invalid email, got ${result.invalidEmails.length}`);
    }

    if (result.invalidEmails[0] !== 'invalid-email-format') {
      throw new Error(`Expected 'invalid-email-format' as invalid, got '${result.invalidEmails[0]}'`);
    }

    // Verify deduplication (case-insensitive)
    const normalized = result.validEmails.map(e => e.toLowerCase());
    if (new Set(normalized).size !== normalized.length) {
      throw new Error('Deduplicated emails contain duplicates!');
    }
  });

  // Check Redis Liveness for Integration Tests
  let isRedisAvailable = false;
  try {
    const pong = await redis.ping();
    isRedisAvailable = pong === 'PONG';
  } catch (e) {
    console.log('⚠️ Redis offline. Skipping Redis rate-limiting integration tests.');
  }

  // Test 2: Redis-backed Rate Limiter
  if (isRedisAvailable) {
    await run('Redis Atomic Rate Limiter', async () => {
      const testUserId = 'test-user-id-' + Date.now();
      const limit = 2;

      // Clean start
      await redis.del(RateLimiterService.getKey(testUserId));

      // Attempt 1
      const res1 = await RateLimiterService.checkAndIncrement(testUserId, limit);
      if (res1.limited || res1.count !== 1) {
        throw new Error(`Attempt 1 should not be limited. Count=${res1.count}`);
      }

      // Attempt 2
      const res2 = await RateLimiterService.checkAndIncrement(testUserId, limit);
      if (res2.limited || res2.count !== 2) {
        throw new Error(`Attempt 2 should not be limited. Count=${res2.count}`);
      }

      // Attempt 3 (Exceeds limit)
      const res3 = await RateLimiterService.checkAndIncrement(testUserId, limit);
      if (!res3.limited || res3.count !== 3) {
        throw new Error(`Attempt 3 should be limited. Count=${res3.count}`);
      }

      // Decrement test
      const decResult = await RateLimiterService.decrement(testUserId);
      if (decResult !== 2) {
        throw new Error(`Expected count after decrement to be 2, got ${decResult}`);
      }

      // Cleanup
      await redis.del(RateLimiterService.getKey(testUserId));
    });
  }

  // Check Postgres Liveness for Integration Tests
  let isPostgresAvailable = false;
  try {
    await prisma.$connect();
    isPostgresAvailable = true;
  } catch (e) {
    console.log('⚠️ PostgreSQL offline. Skipping DB idempotency integration tests.');
  }

  // Test 3: DB Idempotency locking
  if (isPostgresAvailable) {
    await run('Database State Transition Idempotency Lock', async () => {
      // 1. Create a mock user
      const user = await prisma.user.upsert({
        where: { email: 'test-runner@example.com' },
        update: {},
        create: {
          id: 'test-user-uuid',
          googleId: 'test-google-id',
          name: 'Test Runner',
          email: 'test-runner@example.com',
        },
      });

      // 2. Create a campaign
      const campaign = await prisma.campaign.create({
        data: {
          userId: user.id,
          subject: 'Test Subject',
          body: 'Test Body',
          startTime: new Date(),
          delaySeconds: 5,
          hourlyLimit: 100,
        },
      });

      // 3. Create scheduled email
      const email = await prisma.email.create({
        data: {
          campaignId: campaign.id,
          recipient: 'recipient@example.com',
          scheduledAt: new Date(),
          status: 'SCHEDULED',
        },
      });

      // 4. Lock transition (First worker picks it up)
      const update1 = await prisma.email.updateMany({
        where: {
          id: email.id,
          status: { in: ['SCHEDULED', 'RATE_LIMITED'] },
        },
        data: {
          status: 'PROCESSING',
        },
      });

      if (update1.count !== 1) {
        throw new Error(`Expected 1 row updated on first lock, got ${update1.count}`);
      }

      // 5. Duplicate lock transition (Second worker attempts to lock)
      const update2 = await prisma.email.updateMany({
        where: {
          id: email.id,
          status: { in: ['SCHEDULED', 'RATE_LIMITED'] },
        },
        data: {
          status: 'PROCESSING',
        },
      });

      if (update2.count !== 0) {
        throw new Error(`Idempotency violated! Expected 0 rows updated on second lock, got ${update2.count}`);
      }

      // Cleanup
      await prisma.email.delete({ where: { id: email.id } });
      await prisma.campaign.delete({ where: { id: campaign.id } });
    });
  }

  // Summary
  console.log('-------------------------------------------');
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed.`);
  console.log('-------------------------------------------\n');

  // Disconnect clients
  await prisma.$disconnect();
  await redis.quit();

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
