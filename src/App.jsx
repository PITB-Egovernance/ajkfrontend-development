import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Dashboard from 'pages/Dashboard';
import Login from 'pages/auth/Login/Login';
import VerifyOtp from "pages/auth/OTP/VerifyOtp";
import ProtectedRoute from 'middlewares/ProtectedRoute';
import PublicRoute from 'middlewares/PublicRoute';
import Register from 'pages/auth/Register/Register';
import DashboardLayout from 'components/layouts/DashboardLayout';
import Profile from 'pages/profile/Profile';

import RequisitionList from 'pages/RequisitionList';
import RequisitionForm from 'pages/requisition/RequisitionForm';
import RequisitionEdit from 'pages/requisition/RequisitionEdit';
import RequisitionPreview from 'pages/requisition/RequisitionPreview';
import ApprovedRequisitions from 'pages/ApprovedRequisitions';
import AddNotes from 'pages/AddNotes';
import AdvertisementRecords from 'pages/advertisement/AdvertisementRecords';
import AdvertisementCreateForm from 'pages/advertisement/AdvertisementCreateForm';
import AdvertisementDetail from 'pages/advertisement/AdvertisementDetail';
import AdvertisementEditForm from 'pages/advertisement/AdvertisementEditForm';
import AnnexAList from 'pages/AnnexAList';
import AnnexADetail from 'pages/AnnexADetail';
import JobCreation from 'pages/JobCreation';
import JobCreationForm from 'pages/job-creation/JobCreationForm';
import DispatchReceived from 'pages/dispatch/DispatchRecieved';
import DispatchSent from 'pages/dispatch/DispatchSent';
import PscTable from 'pages/PscTable';
import DispatchAddNew from 'pages/dispatch/DispatchAddNew';
import DispatchSentAddNew from 'pages/dispatch/DispatchSentAddNew';
import RequisitionDetail from 'pages/RequisitionDetail';
import Settings from 'pages/settings/Settings';
import OrganizationInformation from 'pages/settings/OrganizationInformation';
import OrganizationalHierarchy from 'pages/settings/OrganizationalHierarchy';
import DistrictsManagement from 'pages/settings/Districts/DistrictsManagement';
import TehsilsManagement from 'pages/settings/TehsilsManagement';
import DesignationsManagement from 'pages/settings/Designation/DesignationsManagement';
import GradesManagement from 'pages/settings/Grades/GradesManagement';
import CompaniesManagement from 'pages/settings/Company/CompaniesManagement';
import ContractorsManagement from 'pages/settings/ContractorsManagement';
import DirectorApprovals from 'pages/approvals/DirectorApprovals';
import SecretaryApprovals from 'pages/approvals/SecretaryApprovals';
import ChairmanApprovals from 'pages/approvals/ChairmanApprovals';
import AdminWorkflowTracking from 'pages/approvals/AdminWorkflowTracking';
import ExamCentersManagement from 'pages/settings/ExamCenters/ExamCentersManagement';
import ExamCitiesManagement from 'pages/settings/Cities/CitiesManagement';
// import ExamHallsManagement from 'pages/settings/ExamHalls/ExamHallsManagement';
// v2.2.0: Exam Halls are no longer managed manually — only Exam Centers. The
// page file is retained for backwards compatibility but no longer routed.
import QualificationsManagement from 'pages/settings/Qualifications/QualificationsManagement';
import DegreesManagement from 'pages/settings/Degrees/DegreesManagement';
import QualificationGroupsManagement from 'pages/settings/QualificationGroups/QualificationGroupsManagement';
import DepartmentsManagement from 'pages/settings/Departments/DepartmentsManagement';
import NationalitiesManagement from 'pages/settings/Nationality/NationalitiesManagement';
import TestsManagement from 'pages/settings/Tests/TestsManagement';
import ExamFeesManagement from 'pages/settings/ExamFees/ExamFeesManagement';
import TestTypesManagement from 'pages/settings/TestTypes/TestTypesManagement';
import TestTypeForm from 'pages/settings/TestTypes/TestTypeForm';
import RequisitionApprovalFlow from 'pages/settings/ApprovalFlow/RequisitionApprovalFlow';
import RequisitionApprovalTrackPage from 'pages/requisition/RequisitionApprovalTrackPage';
import MyRequisitionsQueue from 'pages/requisition/MyRequisitionsQueue';
import SubjectManagement from 'pages/settings/Subject/SubjectManagement';
import WrittenExamSubjectsManagement from 'pages/settings/WrittenExamSubjects/WrittenExamSubjectsManagement';
import SubjectsSyllabus from 'pages/settings/Subject/SubjectsSyllabus';
import CertificatesManagement from 'pages/settings/Certificates/CertificatesManagement';
import RequisitionStatementsManagement from 'pages/settings/RequisitionStatements/RequisitionStatementsManagement';
import DigitalSignatureManagement from 'pages/settings/DigitalSignature/DigitalSignatureManagement';
import SystemSettings from 'pages/settings/SystemSettings/SystemSettings';
import WingsManagement from 'pages/settings/Wings/WingsManagement';
import StampManagement from 'pages/settings/Stamp/StampManagement';
import GroupsManagement from 'pages/settings/Groups/GroupsManagement';
import NewsManagement from 'pages/settings/News/NewsManagement';
import RollNumberSlipInstructions from 'pages/settings/RollNumberSlipInstructions/RollNumberSlipInstructions';
import RollNumberPrefixes from 'pages/settings/RollNumberPrefixes/RollNumberPrefixes';
import RolesManagement from 'pages/settings/Roles/RolesManagement';
import RoleForm from 'pages/settings/Roles/RoleForm';
import DepartmentUserList from 'pages/settings/DepartmentUsers/DepartmentUserList';
import DepartmentUserForm from 'pages/settings/DepartmentUsers/DepartmentUserForm';
import ApplicationDetail from 'pages/applications/ApplicationDetail';
import RollNumberManagement from 'pages/roll-numbers/RollNumberManagement';
import RollSlipEditor from 'pages/roll-numbers/RollSlipEditor';
import RollSlipView from 'pages/roll-numbers/RollSlipView';
import RollNumberVerify from 'pages/roll-numbers/RollNumberVerify';
import RollNumberPublicSlip from 'pages/roll-numbers/RollNumberPublicSlip';
import RollNumberExamFlow from 'pages/roll-numbers/RollNumberExamFlow';
import AwardList from 'pages/award-list/AwardList';
import AwardListDetail from 'pages/award-list/AwardListDetail';
import EmployeesLanding from 'pages/employees/EmployeesLanding';
import EmployeeRegistrationForm from 'pages/employees/EmployeeRegistrationForm';
import EmployeeList from 'pages/employees/EmployeeList';

// Results Module Imports
import AwardListPage from 'pages/results/AwardListPage';
import ImportResultsPage from 'pages/results/ImportResultsPage';
import MarkEntryPage from 'pages/results/MarkEntryPage';
import MeritManagementPage from 'pages/results/MeritManagementPage';
import PublicationPage from 'pages/results/PublicationPage';
import ResultsDashboard from 'pages/results/ResultsDashboard';
import ResultsViewPage from 'pages/results/ResultsViewPage';
import ApprovalsPage from 'pages/results/ApprovalsPage';
import ResultSearchPage from 'pages/results/ResultSearchPage';
import CreateDepartmentUser from 'pages/settings/DepartmentUsers/EditDepartmentUser';
import TermsAndConditionsManagement from "pages/settings/TermsAndConditions/TermsAndConditionsManagement";
function App() {
  return (
    <Router>
      <Routes>
        {/* Fully public — QR code slip verification */}
        <Route path="/verify/roll/:rollNumber" element={<RollNumberVerify />} />
        <Route path="/verify/roll/:rollNumber/slip" element={<RollNumberPublicSlip />} />

        {/* Public pages - redirect to dashboard if already logged in */}
        <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/verify-otp" element={<PublicRoute><VerifyOtp /></PublicRoute>} />

        {/* Protected dashboard route with nested pages */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="job-creation-form" element={<JobCreationForm />} />
          <Route path="requisitions" element={<RequisitionList />} />
          <Route path="requisitions/create" element={<RequisitionForm />} />
          <Route path="requisitions/edit/:id" element={<RequisitionEdit />} />
          <Route path="requisitions/preview" element={<RequisitionPreview />} />
          {/* <Route path="requisitions/approvals" element={<RequisitionApprovalTrackPage />} /> */}
          {/* IMPORTANT: the more specific "edit" route must come before the
              general ":id" route so the Edit button's link matches first. */}
          <Route path="requisitions/:id/edit" element={<RequisitionEdit />} />
          <Route path="requisitions/:id" element={<RequisitionDetail />} />
          <Route path="requisitions/:id/approval-tracking" element={<RequisitionApprovalTrackPage />} />
          <Route path="my-requisitions" element={<MyRequisitionsQueue />} />
          <Route path="approved-requisitions" element={<ApprovedRequisitions />} />
          <Route path="add-notes" element={<AddNotes />} />
          <Route path="advertisement-records" element={<AdvertisementRecords />} />
          <Route path="advertisements/view/:id" element={<AdvertisementDetail />} />
          <Route path="advertisements/edit/:id" element={<AdvertisementEditForm />} />
          <Route
            path="approvals/director"
            element={
              <ProtectedRoute allowedRoles={['director']}>
                <DirectorApprovals />
              </ProtectedRoute>
            }
          />
          <Route
            path="approvals/secretary"
            element={
              <ProtectedRoute allowedRoles={['secretary']}>
                <SecretaryApprovals />
              </ProtectedRoute>
            }
          />
          <Route
            path="approvals/chairman"
            element={
              <ProtectedRoute allowedRoles={['chairman']}>
                <ChairmanApprovals />
              </ProtectedRoute>
            }
          />
          <Route
            path="workflow-tracking"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminWorkflowTracking />
              </ProtectedRoute>
            }
          />
          <Route
            path="advertisements/create"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdvertisementCreateForm />
              </ProtectedRoute>
            }
          />
          <Route path="applications/:id" element={<ApplicationDetail />} />
          <Route path="annex-a" element={<AnnexAList />} />
          <Route path="annex-a/:id" element={<AnnexADetail />} />
          <Route path="job-creation" element={<JobCreation />} />
          <Route path="dispatch/received" element={<DispatchReceived />} />
          <Route path="dispatch/recieved-form" element={<DispatchAddNew />} />
          <Route path="dispatch/sent" element={<DispatchSent />} />
          <Route path="dispatch/sent/add" element={<DispatchSentAddNew />} />
          <Route path="psc-table" element={<PscTable />} />

          {/* Settings Routes */}
          <Route path="settings" element={<Settings />} />
          <Route path="settings/organization" element={<OrganizationInformation />} />
          <Route path="settings/hierarchy" element={<OrganizationalHierarchy />} />
          <Route path="settings/districts" element={<DistrictsManagement />} />
          <Route path="settings/tehsils" element={<TehsilsManagement />} />
          <Route path="settings/designations" element={<DesignationsManagement />} />
          <Route path="settings/grades" element={<GradesManagement />} />
          <Route path="settings/companies" element={<CompaniesManagement />} />
          <Route path="settings/contractors" element={<ContractorsManagement />} />
          <Route path="settings/cities" element={<ExamCitiesManagement />} />
          <Route path="settings/exam-centers" element={<ExamCentersManagement />} />
          {/* <Route path="settings/exam-halls" element={<ExamHallsManagement />} /> */}
          <Route path="settings/qualifications" element={<QualificationsManagement />} />
          <Route path="settings/degrees" element={<DegreesManagement />} />
          <Route path="settings/qualification-groups" element={<QualificationGroupsManagement />} />
          <Route path="settings/departments" element={<DepartmentsManagement />} />
          <Route path="settings/nationalities" element={<NationalitiesManagement />} />
          <Route path="settings/tests" element={<TestsManagement />} />
          <Route path="settings/exam-fees" element={<ExamFeesManagement />} />
          <Route path="settings/test-types" element={<TestTypesManagement />} />
          <Route path="settings/test-types/create" element={<TestTypeForm />} />
          <Route path="settings/test-types/:id/edit" element={<TestTypeForm />} />
          <Route path="approval-flow" element={<RequisitionApprovalFlow />} />
          <Route path="settings/subjects" element={<SubjectManagement />} />
          <Route path="settings/written-exam-subjects" element={<WrittenExamSubjectsManagement />} />
          {/* Public syllabus view (not in sidebar) — open directly via URL */}
          <Route path="settings/subjects-syllabus" element={<SubjectsSyllabus />} />
          <Route path="settings/certificates" element={<CertificatesManagement />} />
          <Route path="settings/requisition-statements" element={<RequisitionStatementsManagement />} />
          <Route path="settings/digital-signatures" element={<DigitalSignatureManagement />} />
          <Route path="settings/system-settings" element={<SystemSettings />} />
          <Route path="settings/wings" element={<WingsManagement />} />
          <Route path="settings/stamps" element={<StampManagement />} />
          <Route path="settings/groups" element={<GroupsManagement />} />
          <Route path="settings/news" element={<NewsManagement />} />
          <Route path="settings/roll-number-slip-instructions" element={<RollNumberSlipInstructions />} />
          <Route path="settings/roll-number-prefixes" element={<RollNumberPrefixes />} />
          <Route path="settings/roles" element={<RolesManagement />} />
          <Route path="settings/roles/create" element={<RoleForm />} />
          <Route path="settings/roles/:hashId" element={<RoleForm />} />
          <Route path="settings/roles/:hashId/edit" element={<RoleForm />} />
          <Route path="settings/department-users" element={<DepartmentUserList />} />
          <Route path="settings/department-users/create" element={<DepartmentUserForm />} />
          <Route path="settings/terms-conditions/" element={<AddNotes />} />

          {/* Roll Number Management Routes */}
          <Route path="roll-numbers" element={<RollNumberManagement />} />
          <Route path="roll-numbers/exam/:examType" element={<RollNumberExamFlow />} />
          <Route path="roll-numbers/edit-slip/:applicationNumber" element={<RollSlipEditor />} />
          <Route path="roll-numbers/slip/:rollNumber" element={<RollSlipView />} />

          {/* Award List Routes */}
          <Route path="award-lists" element={<AwardList />} />
          <Route path="award-lists/:id" element={<AwardListDetail />} />

          {/* Employee Management Routes */}
          <Route path="employees" element={<EmployeesLanding />} />
          <Route path="employees/create" element={<EmployeeRegistrationForm />} />
          <Route path="employees/edit/:hashId" element={<EmployeeRegistrationForm />} />
          <Route path="employees/list" element={<EmployeeList />} />

          {/* Results Module Routes */}
          <Route path="results" element={<ResultsDashboard />} />
          <Route path="results/search" element={<ResultSearchPage />} />
          <Route path="results/view/:jobId?" element={<ResultsViewPage />} />
          <Route
            path="results/approvals"
            element={
              <ProtectedRoute allowedRoles={['admin', 'chairman', 'secretary']}>
                <ApprovalsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="results/entry"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <MarkEntryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="results/import/:jobId?"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ImportResultsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="results/awards/:jobId?"
            element={
              <ProtectedRoute allowedRoles={['secretary', 'admin']}>
                <AwardListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="results/merit/:jobId?"
            element={
              <ProtectedRoute allowedRoles={['admin', 'chairman', 'senior_admin', 'data_entry', 'dataentry']}>
                <MeritManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="results/publish/:jobId?"
            element={
              <ProtectedRoute allowedRoles={['director', 'admin']}>
                <PublicationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/settings/department-users/create"
            element={<CreateDepartmentUser />}
          />

          <Route
            path="/dashboard/settings/department-users/:hashId/edit"
            element={<CreateDepartmentUser />}
          />
        </Route>

        
      </Routes>
    </Router>
  );
}

export default App;
