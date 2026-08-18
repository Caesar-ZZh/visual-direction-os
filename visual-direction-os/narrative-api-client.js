((root, factory) => {
  const contracts = typeof module === 'object' && module.exports
    ? require('./narrative-contracts.js')
    : root?.VDOSNarrativeContracts;
  const api = factory(contracts, root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSNarrativeApiClient = api;
})(typeof window !== 'undefined' ? window : globalThis, (contracts, root) => {
  'use strict';

  if (!contracts) throw new Error('VDOSNarrativeContracts is required before narrative-api-client.js');
  const validators = {
    interpret: contracts.validateInterpretResponse,
    strategy: contracts.validateStrategyResponse,
    sequence: contracts.validateSequenceResponse
  };

  function createError(code, message, cause) {
    const error = new Error(message);
    error.code = code;
    if (cause) error.cause = cause;
    return error;
  }

  function createNarrativeApiClient(options = {}) {
    const baseUrl = String(options.baseUrl || '').replace(/\/+$/, '');
    const demoMode = options.demoMode === true;
    const fixtures = options.fixtures || null;
    const fetchImpl = options.fetchImpl || root?.fetch?.bind(root);

    function validate(stage, data) {
      const validator = validators[stage];
      if (!validator) throw createError('SCHEMA', `Unknown Narrative API stage: ${stage}`);
      const checked = validator(data);
      if (!checked.valid) throw createError('SCHEMA', `Invalid ${stage} response: ${checked.errors.join('; ')}`);
      return checked.value;
    }

    async function request(stage, payload = {}, signal) {
      if (demoMode) {
        if (!fixtures || !fixtures[stage]) throw createError('SCHEMA', `Demo fixture missing for ${stage}.`);
        return validate(stage, contracts.clone(fixtures[stage]));
      }
      if (!baseUrl) throw createError('NOT_CONFIGURED', 'Narrative AI service is not configured.');
      if (typeof fetchImpl !== 'function') throw createError('NETWORK', 'Narrative AI transport is unavailable.');

      let response;
      try {
        response = await fetchImpl(`${baseUrl}/${stage}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload || {}),
          signal
        });
      } catch (error) {
        if (error?.name === 'AbortError') throw error;
        throw createError('NETWORK', 'Narrative AI service could not be reached.', error);
      }

      if (!response?.ok) {
        const status = Number(response?.status) || 0;
        throw createError('HTTP', `Narrative AI service returned HTTP ${status || 'error'}.`);
      }

      let data;
      try {
        data = await response.json();
      } catch (error) {
        throw createError('SCHEMA', `Narrative AI service returned invalid JSON for ${stage}.`, error);
      }
      return validate(stage, data);
    }

    return {
      interpret(payload, signal) { return request('interpret', payload, signal); },
      strategy(payload, signal) { return request('strategy', payload, signal); },
      sequence(payload, signal) { return request('sequence', payload, signal); }
    };
  }

  return { createNarrativeApiClient };
});
