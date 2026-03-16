import 'dotenv/config';
import express, { Request, Response } from 'express';
import { apiReference } from '@scalar/express-api-reference';
import { prisma } from './lib/prisma';

import { FormattedLink } from './types/links';
import { Prisma } from './generated/prisma/client';
import { getOpenApiSpec } from './openapi';

const app = express();
app.use(express.json());

app.use(
  '/docs',
  apiReference({
    theme: 'moon',
    spec: { content: getOpenApiSpec() },
  }),
);

app.get('/favicon.ico', (_req: Request, res: Response) => {
  res.status(204).end();
});

app.get('/', (_req: Request, res: Response) => {
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

app.get('/health', (_req: Request, res: Response) => {
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
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          status: 'error',
          message: 'The provided code does not exist.',
        });
      }
    }

    console.error(error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }

  res.status(204).json({ message: 'link deteled succesfully' });
});

app.get('/api/links', async (_req: Request, res: Response) => {
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

export { app };