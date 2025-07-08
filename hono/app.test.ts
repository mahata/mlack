import { describe, it, expect } from 'vitest';
import { app } from './app';

describe('Health endpoint', () => {
  it('should return status 200 with health message', async () => {
    const response = await app.request('/health');
    
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    
    const body = await response.json();
    expect(body).toEqual({
      status: 'ok',
      message: 'Service is running',
    });
  });

  it('should handle different HTTP methods on health endpoint', async () => {
    const response = await app.request('/health', { method: 'POST' });
    expect(response.status).toBe(404);
  });

  it('should return 404 for non-existent routes', async () => {
    const response = await app.request('/non-existent');
    expect(response.status).toBe(404);
  });
});