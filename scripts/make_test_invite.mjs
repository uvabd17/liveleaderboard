import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const db = new PrismaClient();

try {
  const event = await db.event.findFirst();
  if (!event) {
    console.error('No event found in database. Create an event first.');
    process.exit(1);
  }

  const user = await db.user.findFirst();
  if (!user) {
    console.error('No user found in database. Create a user first.');
    process.exit(1);
  }

  const token = crypto.randomUUID();
  const invite = await db.judgeInvite.create({
    data: {
      token,
      eventId: event.id,
      createdById: user.id,
      singleUse: true,
      expiresAt: null,
    },
  });

  const inviteUrl = `/e/${event.slug}/judge/join?token=${invite.token}`;
  console.log(JSON.stringify({ invite: invite, inviteUrl }));
} catch (err) {
  console.error(err);
  process.exit(1);
} finally {
  await db.$disconnect();
}
