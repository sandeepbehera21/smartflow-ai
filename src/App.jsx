import { useState, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import { useSimulation } from './hooks/useSimulation';
import './styles/global.css';
import './styles/navbar.css';
import './styles/components.css';
import './styles/responsive.css';

const AttendeePage = lazy(() => import('./pages/AttendeePage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

export default function App() {
  const [activeView, setActiveView] = useState('attendee');
  const data = useSimulation(2000);

  return (
    <div className="app-root">
      <div className="bg-mesh" />
      <Navbar
        activeView={activeView}
        onViewChange={setActiveView}
        data={data}
      />
      <main style={{ position: 'relative', zIndex: 1 }} key={activeView} className="animate-fadeIn">
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading interface...</div>}>
          {activeView === 'attendee' ? (
            <AttendeePage data={data} />
          ) : (
            <AdminDashboard data={data} />
          )}
        </Suspense>
      </main>
    </div>
  );
}
