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
import CommissionMembersManagement from 'pages/settings/CommissionMembers/CommissionMembersManagement';
import SecretaryOfficialsManagement from 'pages/settings/SecretaryOfficials/SecretaryOfficialsManagement';

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
import ImageManagement from 'pages/settings/Images/ImageManagement';
import SyllabusManagement from 'pages/settings/Syllabus/SyllabusManagement';
import GroupsManagement from 'pages/settings/Groups/GroupsManagement';
import NewsManagement from 'pages/settings/News/NewsManagement';
import RollNumberSlipInstructions from 'pages/settings/RollNumberSlipInstructions/RollNumberSlipInstructions';
import RollNumberPrefixes from 'pages/settings/RollNumberPrefixes/RollNumberPrefixes';
import RolesManagement from 'pages/settings/Roles/RolesManagement';
import RoleForm from 'pages/settings/Roles/RoleForm';
import DepartmentUserList from 'pages/settings/DepartmentUsers/DepartmentUserList';
import DepartmentUserForm from 'pages/settings/DepartmentUsers/DepartmentUserForm';
import ApplicationDetail from 'pages/applications/ApplicationDetail';
import UnpublishedRollSlips from 'pages/roll-numbers/UnpublishedRollSlips';
import PublishedRollSlips from 'pages/roll-numbers/PublishedRollSlips';
import RollSlipEditor from 'pages/roll-numbers/RollSlipEditor';
import RollSlipView from 'pages/roll-numbers/RollSlipView';
import RollNumberVerify from 'pages/roll-numbers/RollNumberVerify';
import RollNumberPublicSlip from 'pages/roll-numbers/RollNumberPublicSlip';
import RollNumberExamFlow from 'pages/roll-numbers/RollNumberExamFlow';
import CceScreeningResults from 'pages/cce/CceScreeningResults';
import CceMasterDateSheet from 'pages/cce/CceMasterDateSheet';
import CceCandidateDateSheet from 'pages/cce/CceCandidateDateSheet';
import CceRollSlipGeneration from 'pages/cce/CceRollSlipGeneration';
import AwardList from 'pages/award-list/AwardList';
import AwardListDetail from 'pages/award-list/AwardListDetail';
import EmployeesLanding from 'pages/employees/EmployeesLanding';
import EmployeeRegistrationForm from 'pages/employees/EmployeeRegistrationForm';
import EmployeeList from 'pages/employees/EmployeeList';

// Results Module Imports
import AwardListPage from 'pages/results/AwardListPage';
import ImportResultsPage from 'pages/results/ImportResultsPage';
import MeritManagementPage from 'pages/results/MeritManagementPage';
import PublicationPage from 'pages/results/PublicationPage';
import ResultsDashboard from 'pages/results/ResultsDashboard';
import ResultsViewPage from 'pages/results/ResultsViewPage';
import CreateDepartmentUser from 'pages/settings/DepartmentUsers/EditDepartmentUser';
import TermsAndConditionsManagement from "pages/settings/TermsAndConditions/TermsAndConditionsManagement";
import VerificationPage from 'pages/results/VerificationPage';
import InterviewShortlistPage from 'pages/results/InterviewShortlistPage';
import ResultsExamFlow from 'pages/results/ResultsExamFlow';
import PostResultWorkflow from 'pages/results/PostResultWorkflow';
import PostResultLanding from 'pages/results/PostResultLanding';
import InterviewPhaseEditor from 'pages/results/InterviewPhaseEditor';
import CandidateInterviewEditor from 'pages/results/CandidateInterviewEditor';
import StatisticalSummary from 'pages/results/StatisticalSummary';
import AuditTrailReport from 'pages/results/AuditTrailReport';
import ScrutinyRequests from 'pages/results/ScrutinyRequests';

// Reporting & Analytics Module Imports
import ApplicationSummaryReport from 'pages/reports/ApplicationSummaryReport';
import CenterWiseCandidateReport from 'pages/reports/CenterWiseCandidateReport';
import CandidateDistributionReport from 'pages/reports/CandidateDistributionReport';
import CompiledMarksheetWritten from 'pages/reports/CompiledMarksheetWritten';
import CompiledMarksheetCce from 'pages/reports/CompiledMarksheetCce';
import PassFailStatisticsReport from 'pages/reports/PassFailStatisticsReport';
import MeritListReport from 'pages/reports/MeritListReport';
import TieBreakingReport from 'pages/reports/TieBreakingReport';
import ImportDiscrepancyReport from 'pages/reports/ImportDiscrepancyReport';
import TopMarksMeritList from 'pages/reports/TopMarksMeritList';
import CandidateRejectionList from 'pages/reports/CandidateRejectionList';
import FinalRejectedCandidateList from 'pages/reports/FinalRejectedCandidateList';
import InterviewShortlistingList from 'pages/reports/InterviewShortlistingList';
import AwardListForInterview from 'pages/reports/AwardListForInterview';
import InterviewSchedule from 'pages/reports/InterviewSchedule';
import InterviewMarksCompilation from 'pages/reports/InterviewMarksCompilation';
import CombinedMerit from 'pages/reports/CombinedMerit';
import GrievanceComplaintTracking from 'pages/reports/GrievanceComplaintTracking';
import VacancySelectionFunnel from 'pages/reports/VacancySelectionFunnel';
import YearOverYearComparison from 'pages/reports/YearOverYearComparison';
import CategorySelectionRatio from 'pages/reports/CategorySelectionRatio';
import PublicResultGazette from 'pages/reports/PublicResultGazette';


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
          <Route path="settings/commission-members" element={<CommissionMembersManagement />} />
          <Route path="settings/secretary-officials" element={<SecretaryOfficialsManagement />} />

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
          <Route path="settings/images" element={<ImageManagement />} />
          <Route path="settings/syllabus" element={<SyllabusManagement />} />
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

          {/* Roll Number Management Routes — Published/Unpublished are now
              separate pages instead of one combined page with a tab toggle. */}
          <Route path="roll-numbers" element={<UnpublishedRollSlips />} />
          <Route path="roll-numbers/published" element={<PublishedRollSlips />} />
          <Route path="roll-numbers/exam/:examType" element={<RollNumberExamFlow />} />
          <Route path="roll-numbers/edit-slip/:applicationNumber" element={<RollSlipEditor />} />
          <Route path="roll-numbers/slip/:rollNumber" element={<RollSlipView />} />
          <Route path="cce/screening" element={<CceScreeningResults />} />
          <Route path="cce/date-sheet/master" element={<CceMasterDateSheet />} />
          <Route path="cce/date-sheet/candidate" element={<CceCandidateDateSheet />} />
          <Route path="cce/date-sheet/roll-slip" element={<CceRollSlipGeneration />} />

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
          <Route path="results/exam/:examType" element={<ResultsExamFlow />} />
          <Route path="results/view/:jobId?" element={<ResultsViewPage />} />
          <Route
            path="results/statistical-summary"
            element={
              <ProtectedRoute allowedRoles={['admin', 'secretary', 'chairman', 'director']}>
                <StatisticalSummary />
              </ProtectedRoute>
            }
          />
          <Route
            path="results/audit-trail"
            element={
              <ProtectedRoute allowedRoles={['admin', 'secretary', 'chairman', 'director']}>
                <AuditTrailReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="results/scrutiny"
            element={
              <ProtectedRoute allowedRoles={['admin', 'secretary', 'chairman', 'director']}>
                <ScrutinyRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="results/verification/:jobId?"
            element={
              <ProtectedRoute allowedRoles={['admin', 'chairman', 'secretary']}>
                <VerificationPage />
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
          <Route
            path="results/shortlist/:jobId"
            element={
              <ProtectedRoute allowedRoles={['admin', 'director']}>
                <InterviewShortlistPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="results/post-result"
            element={
              <ProtectedRoute allowedRoles={['admin', 'secretary', 'interview_secretary', 'senior_admin', 'chairman', 'director']}>
                <PostResultLanding />
              </ProtectedRoute>
            }
          />
          <Route
            path="results/post-result/:jobId"
            element={
              <ProtectedRoute allowedRoles={['admin', 'secretary', 'interview_secretary', 'senior_admin', 'chairman', 'director']}>
                <PostResultWorkflow />
              </ProtectedRoute>
            }
          />
          <Route
            path="results/post-result/:jobId/interview-phase/:phaseId/edit"
            element={
              <ProtectedRoute allowedRoles={['admin', 'secretary', 'interview_secretary', 'senior_admin', 'chairman', 'director']}>
                <InterviewPhaseEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="results/post-result/:jobId/interview-candidate/:letterId/edit"
            element={
              <ProtectedRoute allowedRoles={['admin', 'secretary', 'interview_secretary', 'senior_admin', 'chairman', 'director']}>
                <CandidateInterviewEditor />
              </ProtectedRoute>
            }
          />

          {/* Reporting & Analytics Module Routes */}
          <Route path="reports/application-summary" element={<ApplicationSummaryReport />} />
          <Route path="reports/center-wise-candidates" element={<CenterWiseCandidateReport />} />
          <Route path="reports/candidate-distribution" element={<CandidateDistributionReport />} />
          <Route path="reports/marksheet-written" element={<CompiledMarksheetWritten />} />
          <Route path="reports/marksheet-cce" element={<CompiledMarksheetCce />} />
          <Route path="reports/pass-fail-statistics" element={<PassFailStatisticsReport />} />
          <Route path="reports/merit-list" element={<MeritListReport />} />
          <Route path="reports/tie-breaking" element={<TieBreakingReport />} />
          <Route path="reports/import-discrepancy" element={<ImportDiscrepancyReport />} />
          <Route path="reports/top-marks-merit" element={<TopMarksMeritList />} />
          <Route path="reports/candidate-rejection" element={<CandidateRejectionList />} />
          <Route path="reports/final-rejected" element={<FinalRejectedCandidateList />} />
          <Route path="reports/interview-shortlist" element={<InterviewShortlistingList />} />
          <Route path="reports/award-list-interview" element={<AwardListForInterview />} />
          <Route path="reports/interview-schedule" element={<InterviewSchedule />} />
          <Route path="reports/interview-marks-compilation" element={<InterviewMarksCompilation />} />
          <Route path="reports/combined-merit" element={<CombinedMerit />} />
          <Route path="reports/grievance-tracking" element={<GrievanceComplaintTracking />} />
          <Route path="reports/vacancy-selection-funnel" element={<VacancySelectionFunnel />} />
          <Route path="reports/year-over-year-comparison" element={<YearOverYearComparison />} />
          <Route path="reports/category-selection-ratio" element={<CategorySelectionRatio />} />
          <Route path="reports/public-result-gazette" element={<PublicResultGazette />} />
        </Route>

        
      </Routes>
    </Router>
  );
}

export default App;
