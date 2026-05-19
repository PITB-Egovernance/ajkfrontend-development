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
import ExamHallsManagement from 'pages/settings/ExamHalls/ExamHallsManagement';
import QualificationsManagement from 'pages/settings/Qualifications/QualificationsManagement';
import DegreesManagement from 'pages/settings/Degrees/DegreesManagement';
import QualificationGroupsManagement from 'pages/settings/QualificationGroups/QualificationGroupsManagement';
import DepartmentsManagement from 'pages/settings/Departments/DepartmentsManagement';
import ApplicationsList from 'pages/applications/ApplicationsList';
import ApplicationDetail from 'pages/applications/ApplicationDetail';
import RollNumberManagement from 'pages/roll-numbers/RollNumberManagement';
import CenterAllocation from 'pages/roll-numbers/CenterAllocation';
import RollSlipGeneration from 'pages/roll-numbers/RollSlipGeneration';
import RollSlipGenerator from 'pages/roll-numbers/RollSlipGenerator';
import RollSlipEditor from 'pages/roll-numbers/RollSlipEditor';
import AwardList from 'pages/award-list/AwardList';
import AwardListDetail from 'pages/award-list/AwardListDetail';


function App() {
  return (
    <Router>
      <Routes>
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
          <Route path="requisitions/:id" element={<RequisitionDetail />} />
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
          <Route path="applications" element={<ApplicationsList />} />
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
          <Route path="settings/exam-halls" element={<ExamHallsManagement />} />
          <Route path="settings/qualifications" element={<QualificationsManagement />} />
          <Route path="settings/degrees" element={<DegreesManagement />} />
          <Route path="settings/qualification-groups" element={<QualificationGroupsManagement />} />
          <Route path="settings/departments" element={<DepartmentsManagement />} />

          {/* Roll Number Management Routes */}
          <Route path="roll-numbers" element={<RollNumberManagement />} />
          <Route path="roll-numbers/generate-slips" element={<RollSlipGenerator />} />
          <Route path="roll-numbers/edit-slip/:applicationNumber" element={<RollSlipEditor />} />
          <Route path="roll-numbers/:advertisementId/center-allocation" element={<CenterAllocation />} />
          <Route path="roll-numbers/:advertisementId/slip-generation" element={<RollSlipGeneration />} />

          {/* Award List Routes */}
          <Route path="award-lists" element={<AwardList />} />
          <Route path="award-lists/:id" element={<AwardListDetail />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
