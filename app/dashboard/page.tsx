import type { Metadata } from 'next';
import Dashboard from '@/components/dashboard/Dashboard';
import LoginForm from '@/components/dashboard/LoginForm';
import WaterBackground from '@/components/WaterBackground';
import { dashboardConfigured, isAuthenticated } from '@/lib/auth';
import './dashboard.css';

export const metadata: Metadata = {
  title: 'Dashboard · Barangay Consultative Meeting · MWSS RO WEP',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  if (!(await isAuthenticated())) {
    return (
      <>
        <WaterBackground />
        <main className="login-page">
          <LoginForm configured={dashboardConfigured()} />
        </main>
      </>
    );
  }
  return <Dashboard />;
}
