#!/usr/bin/env node

import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    getTemplateSource,
    TemplateSourceError,
    updateTemplateSource
} from './dev/template-source.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const host = '127.0.0.1';
const port = Number(process.env.PROMPT_MAKER_PORT || 5001);
const maxBodyBytes = 1024 * 1024;

const mimeTypes = {
    '.css': 'text/css; charset=utf-8',
    '.gif': 'image/gif',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.webp': 'image/webp'
};

function sendJson(response, status, body) {
    const payload = `${JSON.stringify(body)}\n`;
    response.writeHead(status, {
        'Cache-Control': 'no-store',
        'Content-Length': Buffer.byteLength(payload),
        'Content-Type': 'application/json; charset=utf-8'
    });
    response.end(payload);
}

async function readJsonBody(request) {
    if (!String(request.headers['content-type'] || '').startsWith('application/json')) {
        throw new TemplateSourceError(415, 'invalid_content_type', 'Content-Type must be application/json.');
    }

    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
        size += chunk.length;
        if (size > maxBodyBytes) {
            throw new TemplateSourceError(413, 'payload_too_large', 'Update payload exceeds 1 MiB.');
        }
        chunks.push(chunk);
    }

    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
        throw new TemplateSourceError(400, 'invalid_json', 'Request body is not valid JSON.');
    }
}

async function handleDevApi(request, response, url) {
    if (url.pathname === '/__dev/status' && request.method === 'GET') {
        sendJson(response, 200, { writable: true });
        return true;
    }

    const match = url.pathname.match(/^\/__dev\/templates\/(\d+)$/);
    if (!match) return false;

    if (request.method === 'GET') {
        sendJson(response, 200, await getTemplateSource(repoRoot, match[1]));
        return true;
    }

    if (request.method === 'PUT') {
        const body = await readJsonBody(request);
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            throw new TemplateSourceError(400, 'invalid_request', 'Update body must be an object.');
        }
        const result = await updateTemplateSource(repoRoot, match[1], body.revision, body.state);
        sendJson(response, 200, result);
        return true;
    }

    response.writeHead(405, { Allow: 'GET, PUT' });
    response.end();
    return true;
}

function isInsideRepo(filePath) {
    return filePath === repoRoot || filePath.startsWith(`${repoRoot}${path.sep}`);
}

async function resolveStaticPath(urlPathname) {
    let decodedPath;
    try {
        decodedPath = decodeURIComponent(urlPathname);
    } catch {
        return null;
    }

    const relativePath = decodedPath.replace(/^\/+/, '') || 'index.html';
    let filePath = path.resolve(repoRoot, relativePath);
    if (!isInsideRepo(filePath)) return null;

    try {
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) filePath = path.join(filePath, 'index.html');
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        if (path.extname(filePath)) return null;
        const htmlPath = `${filePath}.html`;
        if (!isInsideRepo(htmlPath)) return null;
        try {
            await fs.access(htmlPath);
            filePath = htmlPath;
        } catch {
            return null;
        }
    }

    try {
        const realFilePath = await fs.realpath(filePath);
        return isInsideRepo(realFilePath) ? realFilePath : null;
    } catch {
        return null;
    }
}

async function serveStatic(request, response, url) {
    if (!['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(405, { Allow: 'GET, HEAD' });
        response.end();
        return;
    }

    const filePath = await resolveStaticPath(url.pathname);
    if (!filePath) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Not found\n');
        return;
    }

    const contents = await fs.readFile(filePath);
    response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Length': contents.length,
        'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
    });
    response.end(request.method === 'HEAD' ? undefined : contents);
}

const server = http.createServer(async (request, response) => {
    const url = new URL(request.url || '/', `http://${request.headers.host || `${host}:${port}`}`);
    try {
        if (url.pathname.startsWith('/__dev/')) {
            const handled = await handleDevApi(request, response, url);
            if (!handled) sendJson(response, 404, { error: { code: 'not_found', message: 'Dev API route not found.' } });
            return;
        }
        await serveStatic(request, response, url);
    } catch (error) {
        const status = error instanceof TemplateSourceError ? error.status : 500;
        const code = error instanceof TemplateSourceError ? error.code : 'internal_error';
        const message = error instanceof TemplateSourceError ? error.message : 'Unexpected dev server error.';
        if (status === 500) console.error(error);
        if (!response.headersSent) sendJson(response, status, { error: { code, message } });
        else response.end();
    }
});

server.listen(port, host, () => {
    console.log(`Prompt Maker dev server: http://localhost:${port}/`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => server.close(() => process.exit(0)));
}
