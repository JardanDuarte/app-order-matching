import { Readable, Writable } from 'stream';

export async function request(app, options = {}) {
  const body = options.body === undefined ? null : JSON.stringify(options.body);
  const headers = {
    ...(body ? { 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(body)) } : {}),
    ...(options.headers || {})
  };

  const req = new Readable({
    read() {
      if (body) {
        this.push(body);
      }

      this.push(null);
    }
  });

  req.url = options.path || '/';
  req.method = options.method || 'GET';
  req.headers = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );
  req.connection = { encrypted: false };
  req.socket = {
    encrypted: false,
    destroy() {}
  };

  const chunks = [];
  const responseHeaders = {};

  const res = new Writable({
    write(chunk, encoding, callback) {
      chunks.push(Buffer.from(chunk));
      callback();
    }
  });

  res.statusCode = 200;
  res.headersSent = false;
  res.setHeader = (name, value) => {
    responseHeaders[name.toLowerCase()] = value;
  };
  res.getHeader = name => responseHeaders[name.toLowerCase()];
  res.getHeaders = () => responseHeaders;
  res.removeHeader = name => {
    delete responseHeaders[name.toLowerCase()];
  };
  res.writeHead = (statusCode, statusMessageOrHeaders, maybeHeaders) => {
    res.statusCode = statusCode;

    const headersToSet = typeof statusMessageOrHeaders === 'object'
      ? statusMessageOrHeaders
      : maybeHeaders;

    Object.entries(headersToSet || {}).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    return res;
  };
  res.end = (chunk, encoding, callback) => {
    if (chunk) {
      chunks.push(Buffer.from(chunk));
    }

    res.headersSent = true;
    Writable.prototype.end.call(res, callback || encoding);
  };

  await new Promise((resolve, reject) => {
    res.on('finish', resolve);
    res.on('error', reject);
    app.handle(req, res, reject);
  });

  const raw = Buffer.concat(chunks).toString('utf8');
  let data = raw;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch (error) {
    data = raw;
  }

  return { status: res.statusCode, headers: responseHeaders, body: data };
}
