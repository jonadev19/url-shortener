import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../lib/prisma', () => ({
  prisma: {
    link: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    accessLog: {
      create: vi.fn(),
    },
  },
}));

import { prisma } from '../lib/prisma';
import { app } from '../app';

const mockPrisma = prisma as unknown as {
  link: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  accessLog: {
    create: ReturnType<typeof vi.fn>;
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env['DOMAIN_NAME'] = 'http://localhost:3000';
});

// ---------------------------------------------------------------------------
// GET /
// ---------------------------------------------------------------------------
describe('GET /', () => {
  it('returns 200 with welcome message', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Welcome to the URL Shortener');
  });
});

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------
describe('GET /health', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// GET /favicon.ico
// ---------------------------------------------------------------------------
describe('GET /favicon.ico', () => {
  it('returns 204', async () => {
    const res = await request(app).get('/favicon.ico');
    expect(res.status).toBe(204);
  });
});

// ---------------------------------------------------------------------------
// POST /api/shorten
// ---------------------------------------------------------------------------
describe('POST /api/shorten', () => {
  it('returns short URL when url is provided', async () => {
    mockPrisma.link.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      original_url: 'https://example.com',
      short_url: expect.stringContaining('http://localhost:3000/'),
    });
  });

  it('returns 400 when url is missing', async () => {
    const res = await request(app).post('/api/shorten').send({});

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      status: 'error',
      message: 'The url field is required.',
    });
  });

  it('returns 500 when DB throws', async () => {
    mockPrisma.link.create.mockRejectedValue(new Error('DB error'));

    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com' });

    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// GET /api/links
// ---------------------------------------------------------------------------
describe('GET /api/links', () => {
  it('returns formatted links', async () => {
    mockPrisma.link.findMany.mockResolvedValue([
      { short_code: 'abc123', original_url: 'https://example.com', clicks: 5 },
    ]);

    const res = await request(app).get('/api/links');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        short_url: 'http://localhost:3000/abc123',
        original_url: 'https://example.com',
        clicks: 5,
      },
    ]);
  });

  it('returns 500 when DB throws', async () => {
    mockPrisma.link.findMany.mockRejectedValue(new Error('DB error'));

    const res = await request(app).get('/api/links');
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/links/:short_code
// ---------------------------------------------------------------------------
describe('DELETE /api/links/:short_code', () => {
  it('returns 204 on successful delete', async () => {
    mockPrisma.link.delete.mockResolvedValue({});

    const res = await request(app).delete('/api/links/abc123');
    expect(res.status).toBe(204);
  });

  it('returns 404 when short code does not exist', async () => {
    const { Prisma } = await import('../generated/prisma/client');
    const notFound = new Prisma.PrismaClientKnownRequestError('Not found', {
      code: 'P2025',
      clientVersion: '0.0.0',
    });
    mockPrisma.link.delete.mockRejectedValue(notFound);

    const res = await request(app).delete('/api/links/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ status: 'error' });
  });

  it('returns 500 on unexpected DB error', async () => {
    mockPrisma.link.delete.mockRejectedValue(new Error('DB error'));

    const res = await request(app).delete('/api/links/abc123');
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// GET /:id (redirect)
// ---------------------------------------------------------------------------
describe('GET /:id', () => {
  it('redirects to original URL', async () => {
    mockPrisma.link.findUnique.mockResolvedValue({
      id: '1',
      short_code: 'abc123',
      original_url: 'https://example.com',
    });
    mockPrisma.link.update.mockResolvedValue({});
    mockPrisma.accessLog.create.mockResolvedValue({});

    const res = await request(app).get('/abc123');
    expect(res.status).toBe(302);
    expect(res.headers['location']).toBe('https://example.com');
  });

  it('returns 404 when short code not found', async () => {
    mockPrisma.link.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/notfound');
    expect(res.status).toBe(404);
  });

  it('returns 500 on DB error', async () => {
    mockPrisma.link.findUnique.mockRejectedValue(new Error('DB error'));

    const res = await request(app).get('/abc123');
    expect(res.status).toBe(500);
  });
});