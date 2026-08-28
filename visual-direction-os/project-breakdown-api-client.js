((root, factory) => {
  const contracts = typeof module === 'object' && module.exports
    ? require('./project-contracts.js')
    : root?.VDOSProjectContracts;
  const api = factory(contracts, root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSProjectBreakdownApiClient = api;
})(typeof window !== 'undefined' ? window : globalThis, (contracts, root) => {
  'use strict';

  if (!contracts) throw new Error('VDOSProjectContracts is required before project-breakdown-api-client.js');

  function createError(code, message, cause) {
    const error = new Error(message);
    error.code = code;
    if (cause) error.cause = cause;
    return error;
  }

  function createProjectBreakdownApiClient(options = {}) {
    const baseUrl = String(options.baseUrl || '').replace(/\/+$/, '');
    const fetchImpl = options.fetchImpl || root?.fetch?.bind(root);
    const demoMode = options.demoMode === true;
    const fixtures = options.fixtures || null;

    function validate(data) {
      const checked = contracts.validateBreakdownResponse(data);
      if (!checked.valid) throw createError('SCHEMA', `Invalid Project Breakdown response: ${checked.errors.join('; ')}`);
      return checked.value;
    }

    async function breakdown(payload = {}, signal) {
      if (demoMode) {
        if (!fixtures?.breakdown) throw createError('SCHEMA', 'Project Breakdown demo fixture is missing.');
        return validate(contracts.clone(fixtures.breakdown));
      }
      if (!baseUrl) throw createError('NOT_CONFIGURED', 'Project Breakdown AI service is not configured.');
      if (typeof fetchImpl !== 'function') throw createError('NETWORK', 'Project Breakdown AI transport is unavailable.');

      let response;
      try {
        response = await fetchImpl(`${baseUrl}/api/project/breakdown`, {
          method:'POST',
          headers:{ 'content-type':'application/json' },
          body:JSON.stringify(payload || {}),
          signal
        });
      } catch (error) {
        if (error?.name === 'AbortError') throw error;
        throw createError('NETWORK', 'Project Breakdown AI service could not be reached.', error);
      }
      if (!response?.ok) {
        const status = Number(response?.status) || 0;
        throw createError('HTTP', `Project Breakdown AI service returned HTTP ${status || 'error'}.`);
      }
      let data;
      try {
        data = await response.json();
      } catch (error) {
        throw createError('SCHEMA', 'Project Breakdown AI service returned invalid JSON.', error);
      }
      return validate(data);
    }

    return { breakdown };
  }

  return { createProjectBreakdownApiClient };
});
