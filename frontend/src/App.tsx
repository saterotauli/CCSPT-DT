import './App.css';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import EdificisTable from './react-components/EdificisTable';
import FragImporterPage from './react-components/FragImporterPage';
import IfcToFragExporter from './react-components/IfcToFragExporter';
import ConsultesPage from './react-components/ConsultesPage';

const Header: React.FC = () => {
  const navigate = useNavigate();
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 32px',
      background: '#f5f5f5',
      borderBottom: '1px solid #ddd',
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      boxSizing: 'border-box',
      zIndex: 100
    }}>
      <span style={{ fontWeight: 700, fontSize: 20 }}>Gestor BIM</span>
      <nav style={{ display: 'flex', gap: '24px' }}>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 500, color: '#333', padding: '8px 12px' }}
          onClick={() => navigate('/')}
        >
          Frag Importer
        </button>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 500, color: '#333', padding: '8px 12px' }}
          onClick={() => navigate('/frag-export')}
        >
          IFC to Frag
        </button>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 500, color: '#333', padding: '8px 12px' }}
          onClick={() => navigate('/edificis')}
        >
          Edificis
        </button>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 500, color: '#333', padding: '8px 12px' }}
          onClick={() => navigate('/consultes')}
        >
          Consultes
        </button>
      </nav>
    </header>
  );
};

function AppRoutes() {
  // Altura del header: 64px (16px padding arriba y abajo + contenido)
  return (
    <>
      <Header />
      <div style={{ paddingTop: 64, paddingLeft: 32, paddingRight: 32, boxSizing: 'border-box' }}>
        <Routes>
          <Route path="/" element={<FragImporterPage />} />
          <Route path="/edificis" element={<EdificisTable />} />
          <Route path="/frag-export" element={<IfcToFragExporter />} />
          <Route path="/consultes" element={<ConsultesPage />} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
