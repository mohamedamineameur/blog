import request from 'supertest';
import app from '../../app';

describe('App', () => {
  it('should respond to GET /', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'Hello from Express + TypeScript!',
    });
  });

  it('should handle 404 for unknown routes', async () => {
    const response = await request(app).get('/unknown');
    expect(response.status).toBe(404);
  });
});
