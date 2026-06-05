import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/UI';
import ProtectedRoute from './routes/ProtectedRoute';
import PublicRoute from './routes/PublicRoute';
import Login from './pages/Auth/Login';
import ForgotPassword from './pages/Auth/ForgotPassword';
// Dashboard absorbed into Analytics
import DriverManagement from './pages/Admin/DriverManagement';
import DriverCreate from './pages/Admin/DriverCreate';
import DriverDetail from './pages/Admin/DriverDetail';
import DriverRequest from './pages/Admin/DriverRequest';
import PassengerManagement from './pages/Admin/PassengerManagement';
import PassengerCreate from './pages/Admin/PassengerCreate';
import PassengerDetail from './pages/Admin/PassengerDetail';
import PassengerRequest from './pages/Admin/PassengerRequest';
import FareManagement from './pages/Admin/FareManagement';
import CommissionManagement from './pages/Admin/CommissionManagement';
import PromoManagement from './pages/Admin/PromoManagement';
import PayoutManagement from './pages/Admin/PayoutManagement';
import BookingManagement from './pages/Admin/BookingManagement';
import BookingDetail from './pages/Admin/BookingDetail';
import BookingCreate from './pages/Admin/BookingCreate';
import VehicleManagement from './pages/Admin/VehicleManagement';
import VehicleCreate from './pages/Admin/VehicleCreate';
import VehicleEdit from './pages/Admin/VehicleEdit';
import VehicleDetail from './pages/Admin/VehicleDetail';
import SupportManagement from './pages/Admin/SupportManagement';
import SupportDetail from './pages/Admin/SupportDetail';
import ReportManagement from './pages/Admin/ReportManagement';
import Analytics from './pages/Admin/Analytics';
import CMSManagement from './pages/Admin/CMSManagement';
import Profile from './pages/Admin/Profile';
import UserManagement from './pages/Admin/UserManagment';
import UserCreate from './pages/Admin/UserCreate';
import UserEdit from './pages/Admin/UserEdit';
import UserDetail from './pages/Admin/UserDetail';
import ReviewManagement from './pages/Admin/ReviewManagement';
import ManageNotifications from './pages/Admin/ManageNotifications';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';

function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicRoute />}>
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/forgot" element={<ForgotPassword />} />
          </Route>

          {/* Core Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Dashboard & Analytics Combined */}
          <Route element={<ProtectedRoute module="Dashboard" />}>
            <Route path="/" element={<Analytics />} />
          </Route>

          {/* User Management */}
          <Route element={<ProtectedRoute module="User Management" />}>
            <Route path="/users" element={<UserManagement />} />
            <Route path="/users/create" element={<UserCreate />} />
            <Route path="/users/edit/:id" element={<UserEdit />} />
            <Route path="/users/detail/:id" element={<UserDetail />} />
          </Route>

          {/* Drivers */}
          <Route element={<ProtectedRoute module="Driver Management" />}>
            <Route path="/drivers" element={<DriverManagement />} />
            <Route path="/drivers/create" element={<DriverCreate />} />
            <Route path="/drivers/detail/:id" element={<DriverDetail />} />
            <Route path="/drivers/requests" element={<DriverRequest />} />
          </Route>

          {/* Passengers */}
          <Route element={<ProtectedRoute module="Passenger Management" />}>
            <Route path="/passenger" element={<PassengerManagement />} />
            <Route path="/passenger/create" element={<PassengerCreate />} />
            <Route path="/passenger/detail/:id" element={<PassengerDetail />} />
            <Route path="/passenger/requests" element={<PassengerRequest />} />
          </Route>

          {/* Bookings */}
          <Route element={<ProtectedRoute module="Booking Management" />}>
            <Route path="/bookings" element={<BookingManagement />} />
            <Route path="/bookings/create" element={<BookingCreate />} />
            <Route path="/bookings/detail/:id" element={<BookingDetail />} />
          </Route>

          {/* Vehicles */}
          <Route element={<ProtectedRoute module="Vehicles Management" />}>
            <Route path="/vehicles" element={<VehicleManagement />} />
            <Route path="/vehicles/create" element={<VehicleCreate />} />
            <Route path="/vehicles/edit/:id" element={<VehicleEdit />} />
            <Route path="/vehicles/detail/:id" element={<VehicleDetail />} />
          </Route>

          {/* Financials & Promos */}
          <Route element={<ProtectedRoute module="Fare Management" />}>
            <Route path="/fare-management" element={<FareManagement />} />
          </Route>
          <Route element={<ProtectedRoute module="Commission Management" />}>
            <Route path="/commission-management" element={<CommissionManagement />} />
          </Route>
          <Route element={<ProtectedRoute module="Promo code Management" />}>
            <Route path="/promo-management" element={<PromoManagement />} />
          </Route>
          <Route element={<ProtectedRoute module="Payment Management" />}>
            <Route path="/payout-management" element={<PayoutManagement />} />
          </Route>

          {/* Support & Reports */}
          <Route element={<ProtectedRoute module="Support Ticket" />}>
            <Route path="/support" element={<SupportManagement />} />
            <Route path="/support/report" element={<SupportManagement />} />
            <Route path="/support/detail/:id" element={<SupportDetail />} />
          </Route>
          <Route element={<ProtectedRoute module="Report Management" />}>
            <Route path="/report-management" element={<ReportManagement />} />
          </Route>

          {/* Others */}
          <Route element={<ProtectedRoute module="Notifications" />}>
            <Route path="/alerts" element={<ManageNotifications />} />
          </Route>
          <Route element={<ProtectedRoute module="CMS management" />}>
            <Route path="/cms-management" element={<CMSManagement />} />
          </Route>
          <Route element={<ProtectedRoute module="Reviews & Ratings" />}>
            <Route path="/reviews" element={<ReviewManagement />} />
          </Route>

          {/* Catch All - 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </ToastProvider >
  );
}

export default App;
