import Config from 'Config/Baseurl';
import AuthService from 'Services/AuthService';

const STORAGE_KEY = 'approval_workflow_cases_v1';
const API_BASE = Config.apiUrl;

const STAGES = ['director', 'secretary', 'chairman'];

const nowIso = () => new Date().toISOString();

const getHeaders = () => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
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

const parseStoredCases = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persistCases = (cases) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
};

const buildInitialSteps = () => ({
  director: { status: 'pending', remarks: '', actedAt: null, actedBy: null },
  secretary: { status: 'pending', remarks: '', actedAt: null, actedBy: null },
  chairman: { status: 'pending', remarks: '', actedAt: null, actedBy: null },
});

const mapAdvertisementToCase = (advertisement, idx) => ({
  id: String(advertisement?.id || advertisement?.hash_id || `wf-${idx + 1}`),
  referenceNo: advertisement?.adv_number || `Advertisement-${idx + 1}`,
  title: advertisement?.note || advertisement?.important_notes || 'Recruitment application',
  submittedAt: advertisement?.created_at || advertisement?.adv_date || nowIso(),
  currentStage: 'director',
  workflowStatus: 'in_progress',
  finalDecision: null,
  steps: buildInitialSteps(),
});

const seedFromAdvertisements = async () => {
  const response = await fetch(`${API_BASE}/advertisements`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${AuthService.getToken()}`,
      'X-API-KEY': Config.apiKey,
    },
  });

  const result = await safeJson(response);
  const records = result?.data?.data;

  if (!response.ok || !Array.isArray(records)) {
    return [];
  }

  return records.map(mapAdvertisementToCase);
};

const canUserActOnCase = (item, stage) => {
  if (!item || !stage) return false;
  return item.currentStage === stage && item.workflowStatus === 'in_progress';
};

const getNextStage = (stage) => {
  const idx = STAGES.indexOf(stage);
  if (idx < 0 || idx === STAGES.length - 1) return null;
  return STAGES[idx + 1];
};

const applyActionToCase = (workflowCase, { stage, action, remarks, actorName }) => {
  if (!canUserActOnCase(workflowCase, stage)) {
    throw new Error('This case is no longer at your stage.');
  }

  if (!remarks || !remarks.trim()) {
    throw new Error('Remarks are required.');
  }

  const normalizedAction = action === 'accept' ? 'accepted' : 'rejected';
  const updated = {
    ...workflowCase,
    steps: {
      ...workflowCase.steps,
      [stage]: {
        status: normalizedAction,
        remarks: remarks.trim(),
        actedAt: nowIso(),
        actedBy: actorName || 'N/A',
      },
    },
  };

  if (normalizedAction === 'rejected') {
    return {
      ...updated,
      currentStage: 'completed',
      workflowStatus: 'rejected',
      finalDecision: 'rejected',
    };
  }

  const nextStage = getNextStage(stage);
  if (!nextStage) {
    return {
      ...updated,
      currentStage: 'completed',
      workflowStatus: 'approved',
      finalDecision: 'approved',
    };
  }

  return {
    ...updated,
    currentStage: nextStage,
    workflowStatus: 'in_progress',
    finalDecision: null,
  };
};

class ApprovalWorkflowService {
  static async ensureSeeded() {
    const existing = parseStoredCases();
    if (existing.length > 0) return existing;

    const seeded = await seedFromAdvertisements().catch(() => []);
    if (seeded.length > 0) {
      persistCases(seeded);
      return seeded;
    }

    return [];
  }

  static async getRoleQueue(roleStage) {
    try {
      const response = await fetch(`${API_BASE}/applications/my-approvals?stage=${roleStage}`, {
        method: 'GET',
        headers: getHeaders(),
      });
      const result = await safeJson(response);
      if (response.ok && Array.isArray(result?.data)) {
        return result.data;
      }
    } catch {
      // fallback to local cache
    }

    const cases = await this.ensureSeeded();
    return cases.filter((item) => canUserActOnCase(item, roleStage));
  }

  static async getAdminTracking() {
    try {
      const response = await fetch(`${API_BASE}/applications/workflow-tracking`, {
        method: 'GET',
        headers: getHeaders(),
      });
      const result = await safeJson(response);
      if (response.ok && Array.isArray(result?.data)) {
        return result.data;
      }
    } catch {
      // fallback to local cache
    }

    return this.ensureSeeded();
  }

  static async takeAction({ id, stage, action, remarks, actorName }) {
    try {
      const response = await fetch(`${API_BASE}/applications/${id}/approve`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          action,
          remarks,
          expected_stage: stage,
        }),
      });

      const result = await safeJson(response);
      if (response.ok) {
        return result?.data || result;
      }

      throw new Error(result?.message || 'Action failed');
    } catch {
      const allCases = await this.ensureSeeded();
      const updatedCases = allCases.map((item) => {
        if (String(item.id) !== String(id)) return item;
        return applyActionToCase(item, { stage, action, remarks, actorName });
      });
      persistCases(updatedCases);
      return updatedCases.find((item) => String(item.id) === String(id));
    }
  }
}

export default ApprovalWorkflowService;
