import { useState } from 'react';
import Navbar from './components/Navbar';
import AttendeePage from './pages/AttendeePage';
import AdminDashboard from './pages/AdminDashboard';
import { useSimulation } from './hooks/useSimulation';
import './styles/global.css';
import './styles/navbar.css';
import './styles/components.css';
import './styles/responsive.css';

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
        {activeView === 'attendee' ? (
          <AttendeePage data={data} />
        ) : (
          <AdminDashboard data={data} />
        )}
      </main>
    </div>
  );
}
