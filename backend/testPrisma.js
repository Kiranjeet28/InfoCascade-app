const { PrismaClient } = require('../src/generated/prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Test connection and create a user
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
    },
  });
  console.log('User created:', user);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
