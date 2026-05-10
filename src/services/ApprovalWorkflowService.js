import Config from 'config/baseUrl';
import AuthService from 'services/authService';

const API_BASE = Config.apiUrl;
const ROLE_ACTION_CACHE_KEY = 'role_approval_actions_cache_v1';

const getHeaders = (contentType = true) => ({
  Accept: 'application/json',
  ...(contentType ? { 'Content-Type': 'application/json' } : {}),
  Authorization: `Bearer ${AuthService.getToken()}`,
  'X-API-KEY': Config.apiKey,
});

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const extractList = (result) => {
  if (Array.isArray(result?.data?.data)) return result.data.data;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result)) return result;
  return [];
};

const normalizeStepStatus = (status) => {
  if (!status) return 'pending';
  const key = String(status).toLowerCase();
  if (key === 'approve' || key === 'approved' || key === 'accept') return 'accepted';
  if (key === 'reject' || key === 'rejected') return 'rejected';
  if (key === 'accepted') return 'accepted';
  return key;
};

const normalizeSteps = (steps) => {
  const base = {
    director: { status: 'pending', remarks: '', actedAt: null, actedBy: null },
    secretary: { status: 'pending', remarks: '', actedAt: null, actedBy: null },
    chairman: { status: 'pending', remarks: '', actedAt: null, actedBy: null },
  };

  if (Array.isArray(steps)) {
    steps.forEach((row) => {
      const stage = String(
        row?.stage ||
        row?.role ||
        row?.approver_role ||
        row?.approver?.role ||
        ''
      ).toLowerCase();
      if (!base[stage]) return;
      base[stage] = {
        status: normalizeStepStatus(row?.status || row?.action),
        remarks: row?.remarks || row?.comment || '',
        actedAt: row?.acted_at || row?.created_at || null,
        actedBy:
          row?.acted_by_name ||
          row?.actor_name ||
          row?.approved_by ||
          row?.approver?.username ||
          row?.approver?.name ||
          null,
      };
    });
    return base;
  }

  if (steps && typeof steps === 'object') {
    const hasNestedStageObjects = ['director', 'secretary', 'chairman'].some(
      (stage) => steps[stage] && typeof steps[stage] === 'object'
    );

    // Shape: { director: {...}, secretary: {...}, chairman: {...} }
    ['director', 'secretary', 'chairman'].forEach((stage) => {
      const row = steps[stage];
      if (!row) return;
      base[stage] = {
        status: normalizeStepStatus(row?.status || row?.action),
        remarks: row?.remarks || row?.comment || '',
        actedAt: row?.acted_at || row?.created_at || null,
        actedBy: row?.acted_by_name || row?.actor_name || row?.approved_by || null,
      };
    });

    // Shape: { director_status, director_remarks, ... }
    if (!hasNestedStageObjects) {
      ['director', 'secretary', 'chairman'].forEach((stage) => {
        const status =
          steps?.[`${stage}_status`] ||
          steps?.[`${stage}Status`] ||
          steps?.[`${stage}_decision`] ||
          steps?.[`${stage}Decision`];

        const remarks =
          steps?.[`${stage}_remarks`] ||
          steps?.[`${stage}Remarks`] ||
          steps?.[`${stage}_comment`] ||
          steps?.[`${stage}Comment`] ||
          '';

        const actedAt =
          steps?.[`${stage}_acted_at`] ||
          steps?.[`${stage}ActedAt`] ||
          steps?.[`${stage}_updated_at`] ||
          steps?.[`${stage}UpdatedAt`] ||
          null;

        const actedBy =
          steps?.[`${stage}_acted_by`] ||
          steps?.[`${stage}ActedBy`] ||
          steps?.[`${stage}_by`] ||
          steps?.[`${stage}By`] ||
          null;

        if (status || remarks || actedAt || actedBy) {
          base[stage] = {
            status: normalizeStepStatus(status),
            remarks,
            actedAt,
            actedBy,
          };
        }
      });
    }
  }

  return base;
};

const deriveWorkflowState = (steps) => {
  if (steps.chairman.status === 'accepted') {
    return { currentStage: 'completed', workflowStatus: 'approved', finalDecision: 'approved' };
  }

  const hasRejected = ['director', 'secretary', 'chairman'].some(
    (stage) => steps[stage].status === 'rejected'
  );

  if (hasRejected) {
    return { currentStage: 'completed', workflowStatus: 'rejected', finalDecision: 'rejected' };
  }

  if (steps.director.status === 'pending') {
    return { currentStage: 'director', workflowStatus: 'in_progress', finalDecision: null };
  }

  if (steps.secretary.status === 'pending') {
    return { currentStage: 'secretary', workflowStatus: 'in_progress', finalDecision: null };
  }

  if (steps.chairman.status === 'pending') {
    return { currentStage: 'chairman', workflowStatus: 'in_progress', finalDecision: null };
  }

  return { currentStage: 'director', workflowStatus: 'pending', finalDecision: null };
};

const normalizeCase = (item, idx = 0) => {
  const stepsSource =
    item?.steps ||
    item?.approval_steps ||
    item?.workflow_steps ||
    item?.history ||
    item?.approval_history ||
    item;

  const steps = normalizeSteps(stepsSource || {});

  const derived = deriveWorkflowState(steps);

  return {
    id: item?.hash_id || item?.id || `wf-${idx + 1}`,
    hash_id: item?.hash_id || item?.id || null,
    referenceNo: item?.adv_number || item?.application_no || item?.reference_no || `APP-${idx + 1}`,
    title: item?.title || item?.note || item?.subject || item?.important_notes || 'Recruitment application',
    submittedAt: item?.created_at || item?.adv_date || item?.submitted_at || null,
    currentStage: item?.current_stage || item?.currentStage || derived.currentStage,
    workflowStatus: item?.workflow_status || item?.workflowStatus || derived.workflowStatus,
    finalDecision: item?.final_decision || item?.finalDecision || derived.finalDecision,
    steps,
    raw: item,
  };
};

const getMatchKeys = (item) => {
  const keys = [
    item?.id,
    item?.hash_id,
    item?.referenceNo,
    item?.reference_no,
    item?.adv_number,
    item?.application_no,
    item?.raw?.id,
    item?.raw?.hash_id,
    item?.raw?.adv_number,
    item?.raw?.reference_no,
    item?.raw?.application_no,
  ]
    .filter(Boolean)
    .map((v) => String(v).trim().toLowerCase());

  return Array.from(new Set(keys));
};

const mergeRoleCompletedIntoRows = (rows, completedByRole = {}) => {
  const byKey = new Map();

  rows.forEach((row, index) => {
    getMatchKeys(row).forEach((key) => {
      byKey.set(key, index);
    });
  });

  const merged = rows.map((row) => ({
    ...row,
    steps: {
      director: { ...(row?.steps?.director || { status: 'pending', remarks: '', actedAt: null, actedBy: null }) },
      secretary: { ...(row?.steps?.secretary || { status: 'pending', remarks: '', actedAt: null, actedBy: null }) },
      chairman: { ...(row?.steps?.chairman || { status: 'pending', remarks: '', actedAt: null, actedBy: null }) },
    },
  }));

  ['director', 'secretary', 'chairman'].forEach((role) => {
    const roleRecords = completedByRole[role] || [];

    roleRecords.forEach((record) => {
      const matchedIndex = getMatchKeys(record)
        .map((key) => byKey.get(key))
        .find((index) => index !== undefined);

      if (matchedIndex === undefined) return;

      const stageData = record?.steps?.[role];
      if (!stageData) return;

      const status = normalizeStepStatus(stageData.status);
      if (status !== 'accepted' && status !== 'rejected') return;

      merged[matchedIndex].steps[role] = {
        status,
        remarks: stageData.remarks || '',
        actedAt: stageData.actedAt || null,
        actedBy: stageData.actedBy || null,
      };

      const derived = deriveWorkflowState(merged[matchedIndex].steps);
      merged[matchedIndex].currentStage = derived.currentStage;
      merged[matchedIndex].workflowStatus = derived.workflowStatus;
      merged[matchedIndex].finalDecision = derived.finalDecision;
    });
  });

  return merged;
};

const readRoleActionCache = () => {
  try {
    const raw = localStorage.getItem(ROLE_ACTION_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeRoleActionCache = (records) => {
  localStorage.setItem(ROLE_ACTION_CACHE_KEY, JSON.stringify(records));
};

class ApprovalWorkflowService {
  static async getRoleQueue(roleStage) {
    const response = await fetch(`${API_BASE}/pending/${roleStage}`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const result = await safeJson(response);

    if (!response.ok) {
      throw new Error(result?.message || `Failed to load ${roleStage} pending queue`);
    }

    const list = extractList(result);
    return list.map((item, idx) => normalizeCase(item, idx));
  }

  static async takeAction({ id, stage, action, remarks, recordMeta = null }) {
    const endpointAction = action === 'accept' ? 'approve' : 'reject';
    const response = await fetch(`${API_BASE}/${stage}/${id}/${endpointAction}`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ remarks }),
    });

    const result = await safeJson(response);

    if (!response.ok) {
      throw new Error(result?.message || 'Failed to submit decision');
    }

    const cache = readRoleActionCache();
    const normalizedStatus = action === 'accept' ? 'accepted' : 'rejected';
    const cachedRecord = {
      id,
      stage,
      workflowStatus: normalizedStatus === 'accepted' ? 'approved' : 'rejected',
      finalDecision: normalizedStatus,
      referenceNo: recordMeta?.referenceNo || result?.data?.adv_number || result?.adv_number || String(id),
      title: recordMeta?.title || result?.data?.title || result?.title || 'Recruitment application',
      submittedAt: recordMeta?.submittedAt || null,
      currentStage: 'completed',
      steps: {
        director: { status: 'pending', remarks: '', actedAt: null, actedBy: null },
        secretary: { status: 'pending', remarks: '', actedAt: null, actedBy: null },
        chairman: { status: 'pending', remarks: '', actedAt: null, actedBy: null },
      },
      raw: result?.data || result,
      updatedAt: new Date().toISOString(),
    };

    cachedRecord.steps[stage] = {
      status: normalizedStatus,
      remarks: remarks || '',
      actedAt: new Date().toISOString(),
      actedBy: recordMeta?.actorName || null,
    };

    const deduped = cache.filter((item) => !(String(item.id) === String(id) && item.stage === stage));
    deduped.unshift(cachedRecord);
    writeRoleActionCache(deduped.slice(0, 500));

    return result?.data || result;
  }

  static async getRoleCompleted(roleStage) {
    const endpoints = [
      `${API_BASE}/completed/${roleStage}`,
      `${API_BASE}/history/${roleStage}`,
      `${API_BASE}/processed/${roleStage}`,
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: getHeaders(false),
        });

        const result = await safeJson(response);
        if (!response.ok) continue;

        const list = extractList(result);
        if (list.length > 0) {
          return list
            .map((item, idx) => normalizeCase(item, idx))
            .filter((item) => {
              const stepStatus = item?.steps?.[roleStage]?.status;
              return stepStatus === 'accepted' || stepStatus === 'rejected';
            });
        }
      } catch {
        // try next endpoint
      }
    }

    const cache = readRoleActionCache();
    return cache
      .filter((item) => item.stage === roleStage)
      .map((item, idx) => normalizeCase(item, idx));
  }

  static async getApprovalHistory(hashId) {
    const response = await fetch(`${API_BASE}/approval-history/${hashId}`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const result = await safeJson(response);

    if (!response.ok) {
      throw new Error(result?.message || 'Failed to load approval history');
    }

    return result?.data || result;
  }

  static async getAdminTracking() {
    const trackingEndpoints = [
      `${API_BASE}/workflow-tracking`,
      `${API_BASE}/applications/workflow-tracking`,
    ];

    for (const endpoint of trackingEndpoints) {
      try {
        const trackingResponse = await fetch(endpoint, {
          method: 'GET',
          headers: getHeaders(false),
        });

        const trackingResult = await safeJson(trackingResponse);
        if (!trackingResponse.ok) continue;

        const trackingList = extractList(trackingResult);
        if (trackingList.length > 0) {
          return trackingList.map((item, idx) => normalizeCase(item, idx));
        }
      } catch {
        // try next endpoint
      }
    }

    const adsResponse = await fetch(`${API_BASE}/advertisements`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const adsResult = await safeJson(adsResponse);

    if (!adsResponse.ok) {
      throw new Error(adsResult?.message || 'Failed to load advertisements');
    }

    const adsList = extractList(adsResult);

    const merged = await Promise.all(
      adsList.map(async (ad, idx) => {
        const baseCase = normalizeCase(ad, idx);
        const possibleKeys = [
          baseCase.hash_id,
          ad?.hash_id,
          ad?.id,
          ad?.adv_number,
          ad?.reference_no,
        ].filter(Boolean);

        for (const key of possibleKeys) {
          try {
            const history = await this.getApprovalHistory(key);
            return normalizeCase({ ...ad, ...history, history: history?.history || history?.approval_history || history?.steps || history }, idx);
          } catch {
            // try next key
          }
        }

        return baseCase;
      })
    );

    // Enrich admin rows with role completed decisions so status/remarks are visible
    // even when workflow-tracking endpoint does not yet return stage-wise fields.
    const [directorCompleted, secretaryCompleted, chairmanCompleted] = await Promise.all([
      this.getRoleCompleted('director').catch(() => []),
      this.getRoleCompleted('secretary').catch(() => []),
      this.getRoleCompleted('chairman').catch(() => []),
    ]);

    return mergeRoleCompletedIntoRows(merged, {
      director: directorCompleted,
      secretary: secretaryCompleted,
      chairman: chairmanCompleted,
    });
  }
}

export default ApprovalWorkflowService;
