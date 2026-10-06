const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMessages() {
  try {
    // Check users
    const users = await prisma.user.findMany();
    console.log('Users:', users.map(u => ({ id: u.id, email: u.email, role: u.role })));

    // Check messages
    const messages = await prisma.message.findMany({
      include: { user: true },
      orderBy: { receivedAt: 'desc' }
    });
    console.log('\nMessages count:', messages.length);
    messages.forEach(m => {
      console.log(`- ${m.subject} | Folder: ${m.folder} | User: ${m.user.email} | From: ${m.fromAddress}`);
    });

    // Check threads
    const threads = await prisma.thread.findMany({
      include: { user: true }
    });
    console.log('\nThreads count:', threads.length);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMessages();
