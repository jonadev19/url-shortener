import { prisma } from './lib/prisma';
import { app } from './app';

const PORT = 3000;

app.listen(PORT, async () => {
  await prisma.$connect();
  console.log('Connected to the database');
  console.log(`Server running on http://localhost:${PORT}`);
});