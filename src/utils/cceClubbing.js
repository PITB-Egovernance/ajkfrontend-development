// Shared across CCE pages that let the admin pick an advertisement —
// Screening Results — wherever the backend annotates each advertisement with
// `clubbed_advertisement_ids` (see
// CceScreeningResultService::advertisementsWithGeneratedRollNumbers()).

/**
 * Collapses advertisements that share a clubbed group into a single dropdown
 * entry, so picking one auto-selects every clubbed advertisement together
 * instead of making the admin pick each one individually.
 *
 * Each returned entry has:
 *   designation    — combined job designations joined with ' & '
 *   advId          — hash_id of the anchor advertisement
 *   advIds         — all advertisement hash_ids in the group (for API calls)
 *   isClubbedGroup — true when more than one advertisement is in the group
 *   adv_number     — adv_number of the anchor advertisement
 */
export const groupByClubbedAdvertisements = (advertisements) => {
  const seen = new Set();
  const entries = [];

  advertisements.forEach((adv) => {
    const advId = adv.hash_id || adv.id;
    if (seen.has(advId)) return;

    const siblingIds = Array.isArray(adv.clubbed_advertisement_ids)
      ? adv.clubbed_advertisement_ids.filter(Boolean)
      : [];

    if (siblingIds.length > 0) {
      // Clubbed group: collect this advertisement and all its siblings.
      const allAdvIds  = [advId, ...siblingIds];
      const siblingAdvs = siblingIds.map(sid =>
        advertisements.find(a => (a.hash_id || a.id) === sid)
      ).filter(Boolean);

      allAdvIds.forEach(id => seen.add(id));

      // Combined designation from all advertisements' job lists.
      const allJobs = [adv, ...siblingAdvs].flatMap(a =>
        (a.jobs || a.job_details || a.jobDetails || []).map(j => j.designation).filter(Boolean)
      );
      const designation = [...new Set(allJobs)].join(' & ') || adv.adv_number || advId;

      entries.push({
        id:             advId,
        hash_id:        advId,
        advId,
        advIds:         allAdvIds,
        designation,
        isClubbedGroup: true,
        adv_number:     adv.adv_number,
      });
    } else {
      // Individual advertisement — show its own jobs' designations.
      seen.add(advId);
      const jobs = adv.jobs || adv.job_details || adv.jobDetails || [];
      const designation = jobs.map(j => j.designation).filter(Boolean).join(' & ') || adv.adv_number || advId;

      entries.push({
        id:             advId,
        hash_id:        advId,
        advId,
        advIds:         [advId],
        designation,
        isClubbedGroup: false,
        adv_number:     adv.adv_number,
      });
    }
  });

  return entries;
};
