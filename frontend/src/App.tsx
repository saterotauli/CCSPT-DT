import './App.css';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import EdificisTable from './react-components/EdificisTable';
import FragImporterPage from './react-components/FragImporterPage';
import IfcToFragExporter from './react-components/IfcToFragExporter';
import ConsultesPage from './react-components/ConsultesPage';
import VisorPage from './react-components/visor/VisorPage';
import Sidebar from './Sidebar';
import NotificationsIcon from '@mui/icons-material/Notifications';

const Header: React.FC = () => {
  const navigate = useNavigate();
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      background: '#007EB0',
      borderBottom: '1px solid #007EB0',
      width: '100%',
      height: 56,
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      <img src="/assets/logo_tauli_blanc.png" alt="Logo" style={{ height: 36 }} />
      <nav style={{ display: 'flex', gap: '24px', overflow: 'hidden', flexWrap: 'nowrap' }}>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 500, color: '#fff', padding: '8px 12px', borderRadius: 4, transition: 'background 0.2s' }}
          onClick={() => navigate('/visor')}
          onMouseOver={e => (e.currentTarget.style.background = '#0288d1')}
          onMouseOut={e => (e.currentTarget.style.background = 'none')}
        >
          Visor
        </button>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 500, color: '#fff', padding: '8px 12px', borderRadius: 4, transition: 'background 0.2s' }}
          onClick={() => navigate('/frag-importer')}
          onMouseOver={e => (e.currentTarget.style.background = '#0288d1')}
          onMouseOut={e => (e.currentTarget.style.background = 'none')}
        >
          Frag Importer
        </button>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 500, color: '#fff', padding: '8px 12px', borderRadius: 4, transition: 'background 0.2s' }}
          onClick={() => navigate('/frag-export')}
          onMouseOver={e => (e.currentTarget.style.background = '#0288d1')}
          onMouseOut={e => (e.currentTarget.style.background = 'none')}
        >
          IFC to Frag
        </button>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 500, color: '#fff', padding: '8px 12px', borderRadius: 4, transition: 'background 0.2s' }}
          onClick={() => navigate('/edificis')}
          onMouseOver={e => (e.currentTarget.style.background = '#0288d1')}
          onMouseOut={e => (e.currentTarget.style.background = 'none')}
        >
          Edificis
        </button>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 500, color: '#fff', padding: '8px 12px', borderRadius: 4, transition: 'background 0.2s' }}
          onClick={() => navigate('/consultes')}
          onMouseOver={e => (e.currentTarget.style.background = '#0288d1')}
          onMouseOut={e => (e.currentTarget.style.background = 'none')}
        >
          Consultes
        </button>
      </nav>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 32 }}>
        <div style={{ width: 1, height: 32, background: '#005a7e', opacity: 0.3, marginRight: 16 }} />
        <span style={{ color: '#fff', fontWeight: 500, fontSize: 15, marginRight: 8 }}>Sergio Atero</span>
        <NotificationsIcon style={{ color: '#fff', fontSize: 26, cursor: 'pointer' }} />
      </div>
    </header>
  );
};

function AppRoutes() {
  return (
    // Este div será el hijo flex que ocupa el espacio restante
    <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Routes>
        <Route path="/visor" element={<VisorPage />} />
        <Route path="/" element={<VisorPage />} />
        <Route path="/frag-importer" element={<FragImporterPage />} />
        <Route path="/edificis" element={<EdificisTable />} />
        <Route path="/frag-export" element={<IfcToFragExporter />} />
        <Route path="/consultes" element={<ConsultesPage />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div style={{ display: 'flex', flexDirection: 'row', height: '100vh', width: '100vw', background: '#f8f9fa' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Header />
          <AppRoutes />
        </div>
      </div>
    </Router>
  );
}

export default App;
