import { useState, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import { useSimulation } from './hooks/useSimulation';
import './styles/global.css';
import './styles/navbar.css';
import './styles/components.css';
import './styles/responsive.css';

const AttendeePage = lazy(() => import('./pages/AttendeePage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

function AppInner() {
  const [activeView, setActiveView] = useState('attendee');
  const { isAdmin } = useAuth();
  const data = useSimulation(2000);
  const safeActiveView = activeView === 'admin' && !isAdmin ? 'attendee' : activeView;

  return (
    <div className="app-root">
      <div className="bg-mesh" />
      <Navbar
        activeView={safeActiveView}
        onViewChange={setActiveView}
        data={data}
      />
      <main style={{ position: 'relative', zIndex: 1 }} key={safeActiveView} className="animate-fadeIn">
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading interface...</div>}>
          {safeActiveView === 'attendee' ? (
            <AttendeePage data={data} />
          ) : (
            <AdminDashboard data={data} />
          )}
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
