/**
 * Shared clubbed-post-group logic for the Results module (One Paper Result
 * list, All Results list, etc). Kept in one place instead of duplicated per
 * page — a previous duplication of this same category-alias mapping across
 * pages is exactly what caused several clubbing bugs to drift out of sync.
 *
 * Clubbing itself is resolved server-side (GET /results/clubbed-groups) from
 * the persistent clubbed_group_id / RollNumberGenerationBatch relationship —
 * never inferred here from advertisement/test_type/roll number/post name.
 */

// Route exam-type slug -> backend TestType.exam_category.
export const examTypeToCategory = {
  'one-paper-mcqs': 'one_paper_mcq',
  'two-paper-mcqs': 'two_paper_mcq',
  'written-exams':  'written_exam',
  'cce-exams':      'combined_competitive_exam',
};

const categoryToExamType = Object.fromEntries(
  Object.entries(examTypeToCategory).map(([slug, category]) => [category, slug])
);

/**
 * Resolve a job's own roll-number/results exam-type route slug (e.g.
 * 'one-paper-mcqs') from whatever category info the advertisement listing
 * attached to it. Returns null if it can't be determined (e.g. exam type not
 * yet configured for this post) — callers should treat that post as
 * ungroupable rather than guessing.
 */
export const resolveJobExamTypeSlug = (job) => {
  const category = job.resolved_test_type_exam_category || job.pivot?.test_type_exam_category || job.test_type_exam_category || '';
  return categoryToExamType[category] || null;
};

/**
 * Posts clubbed together at roll-number-generation time are identified by
 * the backend's persistent clubbed_group_id relationship (GET
 * /results/clubbed-groups), never guessed from advertisement/test_type/roll
 * number — a club can span multiple advertisements and departments, and can
 * contain any number of posts. Collapse each full group into a single list
 * row so there is exactly one "Import Marks" action — and therefore one
 * combined CSV/Excel import — per clubbed group, instead of one per post.
 *
 * JobDetail hides its raw numeric id from every API response (see
 * JobDetail::$hidden on the backend) — hash_id is the only identifier that
 * ever actually exists on a job object here, so it's the sole key used
 * throughout this matching logic (never job.id, which is always undefined).
 */
export const applyClubbedGroups = (flatJobs, apiGroups) => {
  const byId = new Map(flatJobs.filter((j) => j.hash_id).map((j) => [j.hash_id, j]));
  const seen = new Set();
  const processed = [];

  const resolveMember = (postId, group) => {
    const local = byId.get(postId);
    if (local) return local;
    const apiPost = (group.posts || []).find((p) => p.post_id === postId);
    if (!apiPost) return null;
    return {
      id: postId,
      hash_id: postId,
      designation: apiPost.post_name,
      department: apiPost.department,
      adv: apiPost.adv_number ? { adv_number: apiPost.adv_number } : undefined,
    };
  };

  // Materialize every clubbed group first — independent of flatJobs — so a
  // club is rendered even when NONE of its members happen to pass this
  // page's own advertisement/eligibility fetch (the backend already only
  // returns groups whose roll numbers were actually generated).
  (apiGroups || []).forEach((group) => {
    const postIds = group.post_ids || [];
    if (postIds.length < 2) return;
    if (postIds.some((id) => seen.has(id))) return;

    const memberDisplays = postIds.map((id) => resolveMember(id, group)).filter(Boolean);
    if (memberDisplays.length < 2) return;

    postIds.forEach((id) => seen.add(id));

    const anchor = postIds.map((id) => byId.get(id)).find(Boolean) || memberDisplays[0];

    // A club can span multiple advertisements/departments (see comment above),
    // but the anchor only carries its own single `advertisements[0]` — collect
    // every member's advertisement number too, so pages can let the admin
    // filter/select among all advertisements actually present in this group
    // instead of only ever seeing the anchor's.
    const memberAdvNumber = (m) => m.advertisements?.[0]?.adv_number || m.adv?.adv_number;
    const clubbedAdvNumbers = Array.from(new Set(memberDisplays.map(memberAdvNumber).filter(Boolean)));

    // Per-member detail (id/designation/adv_number), kept alongside the merged
    // display fields above — lets a page list each clubbed post as its own
    // selectable row instead of only the single merged "X & Y" designation.
    const clubbedMembers = memberDisplays.map((m) => ({
      id: m.hash_id || m.id,
      designation: m.designation,
      adv_number: memberAdvNumber(m),
    }));

    processed.push({
      ...anchor,
      designation: memberDisplays.map((m) => m.designation).join(' & '),
      isClubbedGroup: true,
      clubbedJobIds: memberDisplays.map((m) => m.hash_id || m.id),
      clubbedAdvNumbers,
      clubbedMembers,
    });
  });

  // Remaining, un-clubbed jobs pass through untouched.
  flatJobs.forEach((job) => {
    const key = job.hash_id || job.id;
    if (seen.has(key)) return;
    seen.add(key);
    processed.push(job);
  });

  return processed;
};

/**
 * Fetch and apply clubbed groups for a list of jobs that may span more than
 * one exam type (e.g. the "All Results" dashboard, unlike the per-category
 * One Paper/Two Paper/Written/CCE result lists). Buckets jobs by their own
 * resolved exam-type slug so each bucket's category/roll-number-batch
 * signals are queried correctly, then merges every group found before
 * applying them across the full combined job list.
 */
export const fetchAndApplyClubbedGroups = async (resultsApi, flatJobs) => {
  const buckets = new Map(); // slug -> job hash_ids
  flatJobs.forEach((job) => {
    if (!job.hash_id) return;
    const slug = resolveJobExamTypeSlug(job);
    if (!slug) return;
    if (!buckets.has(slug)) buckets.set(slug, []);
    buckets.get(slug).push(job.hash_id);
  });

  const results = await Promise.all(
    Array.from(buckets.entries()).map(async ([slug, jobIds]) => {
      try {
        const res = await resultsApi.getClubbedGroups(jobIds, examTypeToCategory[slug], slug);
        return res?.data?.groups ?? res?.groups ?? [];
      } catch {
        return []; // clubbing info is a display enhancement — fall back to ungrouped rows for this bucket
      }
    })
  );

  const clubbedGroups = results.flat();
  return applyClubbedGroups(flatJobs, clubbedGroups);
};
