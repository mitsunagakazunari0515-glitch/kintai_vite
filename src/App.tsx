import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { EmployeeList } from './pages/admin/EmployeeList';
import { EmployeeRegistration } from './pages/admin/EmployeeRegistration';
import { EmployeePayroll } from './pages/admin/EmployeePayroll';
import { AllowanceMaster } from './pages/admin/AllowanceMaster';
import { DeductionMaster } from './pages/admin/DeductionMaster';
import { Payroll } from './pages/admin/Payroll';
import { RequestApproval } from './pages/admin/RequestApproval';
import { AttendanceList } from './pages/admin/AttendanceList';
import { Attendance } from './pages/employee/Attendance';
import { LeaveRequest } from './pages/employee/LeaveRequest';

/**
 * 管理者用ルートコンポーネント。
 * 管理者向けの画面ルーティングを定義します。
 *
 * @returns {JSX.Element} 管理者用ルートコンポーネント。
 */
const AdminRoutes = () => (
  <Layout>
    <Routes>
      <Route path="/employees" element={<EmployeeList />} />
      <Route path="/employees/register" element={<EmployeeRegistration />} />
      <Route path="/employees/edit/:id" element={<EmployeeRegistration />} />
      <Route path="/employees/:employeeId/payroll" element={<EmployeePayroll />} />
      <Route path="/attendance" element={<AttendanceList />} />
      <Route path="/allowances" element={<AllowanceMaster />} />
      <Route path="/deductions" element={<DeductionMaster />} />
      <Route path="/payroll" element={<Payroll />} />
      <Route path="/requests" element={<RequestApproval />} />
      <Route path="*" element={<Navigate to="/admin/employees" replace />} />
    </Routes>
  </Layout>
);

/**
 * 従業員用ルートコンポーネント。
 * 従業員向けの画面ルーティングを定義します。
 *
 * @returns {JSX.Element} 従業員用ルートコンポーネント。
 */
const EmployeeRoutes = () => (
  <Layout>
    <Routes>
      <Route path="/attendance" element={<Attendance />} />
      <Route path="/leave" element={<LeaveRequest />} />
      <Route path="*" element={<Navigate to="/employee/attendance" replace />} />
    </Routes>
  </Layout>
);

/**
 * アプリケーションルートコンポーネント。
 * 認証状態に応じたルーティングを管理します。
 *
 * @returns {JSX.Element | null} アプリケーションルートコンポーネント。認証状態の復元中はnullを返します。
 */
const AppRoutes = () => {
  const { isLoading } = useAuth();

  // 認証状態の復元中は何も表示しない
  if (isLoading) {
    return null; // またはローディングスピナーを表示
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminRoutes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/*"
        element={
          <ProtectedRoute requiredRole="employee">
            <EmployeeRoutes />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

/**
 * アプリケーションのルートコンポーネント。
 * 認証プロバイダーとルーティングを設定します。
 *
 * @returns {JSX.Element} アプリケーションコンポーネント。
 */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
