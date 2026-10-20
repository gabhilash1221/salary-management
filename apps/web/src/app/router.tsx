import { Navigate, Route, Routes } from 'react-router-dom';
import { AnalyticsPage } from '../features/analytics/AnalyticsPage';
import { AuditPage } from '../features/audit/AuditPage';
import { useAuth } from '../features/auth/auth-context';
import { LoginPage } from '../features/auth/LoginPage';
import { EmployeeDetailPage } from '../features/employees/EmployeeDetailPage';
import { EmployeeListPage } from '../features/employees/EmployeeListPage';
import { QuestionsPage } from '../features/questions/QuestionsPage';
import { AppLayout } from './layout/AppLayout';

function RequireAuth() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <AppLayout />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Navigate to="/employees" replace />} />
        <Route path="/employees" element={<EmployeeListPage />} />
        <Route path="/employees/:employeeId" element={<EmployeeDetailPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/questions" element={<QuestionsPage />} />
        <Route path="/audit" element={<AuditPage />} />
      </Route>
    </Routes>
  );
}
