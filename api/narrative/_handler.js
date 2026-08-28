'use strict';

const { STAGES, validateInput, validateOutput } = require('./_contracts.js');
const { createOpenAIProvider } = require('./_openai-adapter.js');
const { validateProjectContext } = require('../../visual-direction-os/project-context.js');

const LOCAL_ORIGINS = new Set(['http://127.0.0.1:4173', 'http://localhost:4173']);

function setCors(res, origin) {
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function originAllowed(origin, allowedOrigin, production) {
  if (!origin) return !production;
  if (allowedOrigin && origin === allowedOrigin) return true;
  if (!production && LOCAL_ORIGINS.has(origin)) return true;
  return false;
}

function createHandler({ stage, provider, allowedOrigin = '', production = process.env.NODE_ENV === 'production' } = {}) {
  if (!STAGES.includes(stage)) throw new Error(`Unknown Narrative API stage: ${stage}`);
  if (!provider || typeof provider.generate !== 'function') throw new Error('Narrative provider.generate is required.');

  return async function narrativeHandler(req, res) {
    const origin = String(req?.headers?.origin || '');
    if (!originAllowed(origin, allowedOrigin, production)) {
      res.setHeader('Vary', 'Origin');
      return sendError(res, 403, 'FORBIDDEN', 'This origin is not allowed to use the Narrative API.');
    }
    setCors(res, origin || allowedOrigin || '');

    if (req?.method === 'OPTIONS') {
      if (typeof res.status === 'function') res.status(204);
      if (typeof res.end === 'function') return res.end();
      return res.json({});
    }

    if (req?.method !== 'POST') {
      return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Narrative API endpoints accept POST requests only.');
    }

    const checkedInput = validateInput(stage, req?.body);
    if (!checkedInput.valid) {
      return sendError(res, 400, 'BAD_REQUEST', checkedInput.errors.join('; '));
    }

    if (stage === 'interpret' && req?.body?.projectContext != null) {
      const checkedContext = validateProjectContext(req.body.projectContext);
      if (!checkedContext.valid) {
        return sendError(res, 400, 'BAD_REQUEST', checkedContext.errors.join('; '));
      }
      checkedInput.value.projectContext = checkedContext.value;
    }

    let generated;
    try {
      generated = await provider.generate({ stage, input: checkedInput.value });
    } catch (error) {
      const code = error?.code === 'SCHEMA' ? 'SCHEMA' : 'PROVIDER';
      return sendError(
        res,
        502,
        code,
        code === 'SCHEMA'
          ? 'The Narrative model returned an invalid structured response.'
          : 'The Narrative model provider could not complete the request.'
      );
    }

    const checkedOutput = validateOutput(stage, generated, { input: checkedInput.value });
    if (!checkedOutput.valid) {
      return sendError(res, 502, 'SCHEMA', 'The Narrative model returned an invalid structured response.');
    }

    return res.status(200).json(checkedOutput.value);
  };
}

function createProductionHandler(stage, options = {}) {
  const env = options.env || process.env;
  const provider = options.provider || createOpenAIProvider({
    apiKey: env.OPENAI_API_KEY || '',
    model: env.OPENAI_MODEL || 'gpt-5.6',
    fetchImpl: options.fetchImpl || globalThis.fetch
  });
  return createHandler({
    stage,
    provider,
    allowedOrigin: env.VDOS_ALLOWED_ORIGIN || '',
    production: env.NODE_ENV === 'production'
  });
}

module.exports = { createHandler, createProductionHandler, originAllowed };