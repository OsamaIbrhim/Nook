import { createApp } from '../../src/app.js';

export async function startApi(options) {
  const app = createApp(options);
  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  let clientIp = 0;

  async function request(method, path, { token, body, rawBody, headers = {}, cookie, ip } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'x-forwarded-for': ip || `10.0.0.${(clientIp = (clientIp % 250) + 1)}`,
        ...(token && { authorization: `Bearer ${token}` }),
        ...(cookie && { cookie }),
        ...(body !== undefined && { 'content-type': 'application/json' }),
        ...headers
      },
      body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body))
    });
    const text = await response.text();
    return { status: response.status, headers: response.headers, setCookies: response.headers.getSetCookie(), body: text ? JSON.parse(text) : null };
  }

  return {
    request,
    async stop() { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
  };
}
