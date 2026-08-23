((root, factory) => {
  const authority = typeof module === 'object' && module.exports
    ? require('./project-constraint-authority.js')
    : root?.VDOSProjectConstraintAuthority;
  const api = factory(authority);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSVisualSequenceProjectConstraints = api;
})(typeof window !== 'undefined' ? window : globalThis, authority => {
  'use strict';

  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

  function guardProjectConstraints(args = {}) {
    const resolver = args.resolver || authority;
    if (!resolver?.resolveProjectConstraintAuthority) throw new Error('VDOSProjectConstraintAuthority is required before visual-sequence-project-constraints.js');
    const input = { ...args };
    delete input.resolver;
    const result = resolver.resolveProjectConstraintAuthority(input);
    if (!result?.safeToComplete) {
      const error = new Error('Project constraint review is required before Sequence completion.');
      error.code = 'PROJECT_CONSTRAINT_REVIEW_REQUIRED';
      error.resolutions = clone(result?.resolutions || []);
      error.conflicts = clone(result?.conflicts || []);
      throw error;
    }
    return clone(result);
  }

  return { guardProjectConstraints };
});
