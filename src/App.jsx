import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Dashboard from './Views/Dashboard';
import Login from "./Views/Auth/Login/Login";
import ProtectedRoute from "./Routes/ProtectedRoute";
import Register from "./Views/Auth/Register/Register";
import DashboardLayout from './Views/Layouts/DashboardLayout';
import RequisitionForm from './Views/RequisitionForm/RequisitionForm';
import RequisitionList from './Views/Pages/RequisitionList';
import ApprovedRequisitions from './Views/Pages/ApprovedRequisitions';
import AddNotes from './Views/Pages/AddNotes';
import AdvertisementRecords from './Views/Pages/AdvertisementRecords';
import AnnexAList from './Views/Pages/AnnexAList';
import JobCreation from './Views/Pages/JobCreation';
import DispatchReceived from './Views/Dispatch/DispatchRecieved';
import DispatchSent from './Views/Dispatch/DispatrchSent';
import PscTable from './Views/Pages/PscTable';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

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
          <Route path="requisition-form" element={<RequisitionForm />} />
          <Route path="requisitions" element={<RequisitionList />} />
          <Route path="approved-requisitions" element={<ApprovedRequisitions />} />
          <Route path="add-notes" element={<AddNotes />} />
          <Route path="advertisement-records" element={<AdvertisementRecords />} />
          <Route path="annex-a" element={<AnnexAList />} />
          <Route path="job-creation" element={<JobCreation />} />
          <Route path="dispatch/received" element={<DispatchReceived />} />
          <Route path="dispatch/sent" element={<DispatchSent />} />
          <Route path="psc-table" element={<PscTable />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
