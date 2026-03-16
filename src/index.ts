import 'dotenv/config';
import express, { Request, Response } from 'express';
import { apiReference } from '@scalar/express-api-reference';
import { prisma } from './lib/prisma';

import { FormattedLink } from './types/links';
import { Prisma } from './generated/prisma/client';
import { openApiSpec } from './openapi';

const app = express();
app.use(express.json());
const PORT = 3000;

app.use(
  '/docs',
  apiReference({
    theme: 'moon',
    spec: { content: openApiSpec },
  }),
);

app.get('/favicon.ico', (req: Request, res: Response) => {
  res.status(204).end();
});

app.get('/', (req: Request, res: Response) => {
  res.send(
    '<h1>Welcome to the URL Shortener</h1><p>Use /api/shorten to create links.</p>',
  );
});

app.post('/api/shorten', async (req: Request, res: Response) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      status: 'error',
      message: 'The url field is required.',
    });
  }

  const domainName = process.env['DOMAIN_NAME'];
  const id = Math.random().toString(36).slice(2, 8);

  const shortUrl = `${domainName}/${id}`;

  try {
    await prisma.link.create({
      data: {
        short_code: id,
        original_url: url,
      },
    });

    res.json({ short_url: shortUrl, original_url: url });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.send('<h1>Server running</h1>');
});

app.delete('/api/links/:short_code', async (req: Request, res: Response) => {
  const { short_code } = req.params;

  try {
    await prisma.link.delete({
      where: {
        short_code: short_code as string,
      },
    });
  } catch (error) {
    // Verificamos si es un error conocido de Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2025 es el código para "An operation failed because it depends on one or more records that were not found"
      if (error.code === 'P2025') {
        return res.status(404).json({
          status: 'error',
          message: 'The provided code does not exist.',
        });
      }
    }

    // Si es otro tipo de error, entonces sí es un 500
    console.error(error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }

  res.status(204).json({ message: 'link deteled succesfully' });
});

app.get('/api/links', async (req: Request, res: Response) => {
  try {
    const links = await prisma.link.findMany({
      select: {
        short_code: true,
        original_url: true,
        clicks: true,
      },
    });

    const linksFormatted: FormattedLink[] = links.map((link) => {
      const { short_code, ...rest } = link;

      return {
        short_url: `${process.env['DOMAIN_NAME']}/${short_code}`,
        ...rest,
      };
    });

    res.json(linksFormatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

app.get('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const ip_address =
    (req.headers['x-forwarded-for'] as string) ?? req.ip ?? 'unknown';
  const user_agent = req.get('User-Agent') || '';

  try {
    const data = await prisma.link.findUnique({
      where: { short_code: id },
    });

    if (!data) {
      return res.status(404).send('URL not found');
    }

    await prisma.link.update({
      where: { short_code: id },
      data: { clicks: { increment: 1 } },
    });

    await prisma.accessLog.create({
      data: {
        ip_address,
        user_agent,
        link_id: data.id,
      },
    });

    res.redirect(302, data.original_url);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

app.listen(PORT, async () => {
  await prisma.$connect();
  console.log('Connected to the database');
  console.log(`Server running on http://localhost:${PORT}`);
});
