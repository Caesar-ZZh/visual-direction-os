'use strict';

const { validateInput, validateOutput } = require('./_contracts.js');
const { createProjectOpenAIProvider } = require('./_openai-adapter.js');
const LOCAL_ORIGINS = new Set(['http://127.0.0.1:4173','http://localhost:4173']);

function setCors(res, origin) {
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
}
function sendError(res,status,code,message){ return res.status(status).json({error:{code,message}}); }
function originAllowed(origin, allowedOrigin, production) {
  if (!origin) return !production;
  if (allowedOrigin && origin === allowedOrigin) return true;
  if (!production && LOCAL_ORIGINS.has(origin)) return true;
  return false;
}

function createHandler({ provider, allowedOrigin='', production=process.env.NODE_ENV === 'production' } = {}) {
  if (!provider || typeof provider.generate !== 'function') throw new Error('Project Breakdown provider.generate is required.');
  return async function projectBreakdownHandler(req,res) {
    const origin = String(req?.headers?.origin || '');
    if (!originAllowed(origin, allowedOrigin, production)) {
      res.setHeader('Vary','Origin');
      return sendError(res,403,'FORBIDDEN','This origin is not allowed to use the Project Breakdown API.');
    }
    setCors(res, origin || allowedOrigin || '');
    if (req?.method === 'OPTIONS') {
      if (typeof res.status === 'function') res.status(204);
      if (typeof res.end === 'function') return res.end();
      return res.json({});
    }
    if (req?.method !== 'POST') return sendError(res,405,'METHOD_NOT_ALLOWED','Project Breakdown API accepts POST requests only.');
    const checkedInput = validateInput(req?.body);
    if (!checkedInput.valid) return sendError(res,400,'BAD_REQUEST',checkedInput.errors.join('; '));
    let generated;
    try { generated = await provider.generate({ input:checkedInput.value }); }
    catch (error) {
      const code = error?.code === 'SCHEMA' ? 'SCHEMA' : 'PROVIDER';
      return sendError(res,502,code,code === 'SCHEMA'
        ? 'The Project Breakdown model returned an invalid structured response.'
        : 'The Project Breakdown model provider could not complete the request.');
    }
    const checkedOutput = validateOutput(generated);
    if (!checkedOutput.valid) return sendError(res,502,'SCHEMA','The Project Breakdown model returned an invalid structured response.');
    return res.status(200).json(checkedOutput.value);
  };
}

function createProductionHandler(options = {}) {
  const env = options.env || process.env;
  const provider = options.provider || createProjectOpenAIProvider({
    apiKey:env.OPENAI_API_KEY || '',
    model:env.OPENAI_MODEL || 'gpt-5.6',
    fetchImpl:options.fetchImpl || globalThis.fetch
  });
  return createHandler({ provider, allowedOrigin:env.VDOS_ALLOWED_ORIGIN || '', production:env.NODE_ENV === 'production' });
}

module.exports = { createHandler, createProductionHandler, originAllowed };
