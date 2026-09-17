function requireId(id) { if (!id) throw new Error('A contest ID or slug is required.'); }

export const contestList = ({ client }) => client.list();
export function contestGet({ client, id }) { requireId(id); return client.get(id); }
export function contestCreate({ client, options }) {
  if (!options.title || !options['starts-at'] || !options['submissions-close-at'] || !options['judging-closes-at']) throw new Error('--title, --starts-at, --submissions-close-at, and --judging-closes-at are required.');
  return client.create({
    title: options.title, slug: options.slug, description: options.description,
    problemStatement: options.problem, rules: options.rules, theme: options.theme,
    coverUrl: options.cover, templateContent: options.template,
    startsAt: options['starts-at'], submissionsCloseAt: options['submissions-close-at'],
    judgingClosesAt: options['judging-closes-at'], resultsAt: options['results-at'],
    requiredTopics: options.tag || [], allowedTargets: options['allowed-target'] || ['personal'],
    perAuthorLimit: options.limit ? Number(options.limit) : 1,
  });
}
export function contestEdit({ client, id, options }) {
  requireId(id);
  return client.update(id, Object.fromEntries(Object.entries({
    title: options.title, description: options.description, problemStatement: options.problem,
    rules: options.rules, theme: options.theme, templateContent: options.template,
    coverUrl: options.cover, startsAt: options['starts-at'],
    submissionsCloseAt: options['submissions-close-at'], judgingClosesAt: options['judging-closes-at'],
    resultsAt: options['results-at'], requiredTopics: options.tag,
    allowedTargets: options['allowed-target'], perAuthorLimit: options.limit ? Number(options.limit) : undefined,
  }).filter(([, value]) => value !== undefined)));
}
export function contestPublish({ client, id, options }) { requireId(id); if (!options.yes) throw new Error('Publishing a contest requires --yes.'); return client.update(id, { action: 'publish' }); }
export function contestCancel({ client, id, options }) { requireId(id); if (!options.yes) throw new Error('Cancelling a contest requires --yes.'); return client.update(id, { action: 'cancel' }); }
export function contestSubmissions({ client, id, options }) { requireId(id); return client.submissions(id, { snapshot: options.snapshot }); }
export function contestSubmit({ client, id, options }) { requireId(id); if (!options.blog) throw new Error('--blog is required.'); return client.submit(id, options.blog); }
export function contestWithdraw({ client, id, options }) { requireId(id); if (!options.submission) throw new Error('--submission is required.'); if (!options.yes) throw new Error('Withdrawing requires --yes.'); return client.withdraw(id, options.submission); }
export function contestMembers({ client, id }) { requireId(id); return client.members(id); }
export function contestRole({ client, id, options }) { requireId(id); if (!options.user || !options.role) throw new Error('--user and --role are required.'); return client.assign(id, options.user, options.role); }
export function contestRemoveMember({ client, id, options }) { requireId(id); if (!options.user || !options.yes) throw new Error('--user and --yes are required.'); return client.removeMember(id, options.user); }
export function contestResults({ client, id, options }) {
  requireId(id);
  if (!options.award?.length) throw new Error('At least one --award placement:submission-id is required.');
  if (options.finalize && !options.yes) throw new Error('Finalizing results requires --yes.');
  const awards = options.award.map((value) => { const separator = value.indexOf(':'); if (separator < 1) throw new Error(`Invalid award: ${value}`); return { placement: value.slice(0, separator), submissionId: value.slice(separator + 1) }; });
  return client.results(id, awards, options.finalize);
}
