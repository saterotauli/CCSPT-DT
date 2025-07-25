import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import EdificisTable from './react-components/EdificisTable';
import FragImporterPage from './react-components/FragImporterPage';
import IfcToFragExporter from './react-components/IfcToFragExporter';
import ConsultesPage from './react-components/ConsultesPage';
import ConfigPage from './react-components/ConfigPage';
import FMPage from './react-components/visor/FMPage';
import Sidebar from './Sidebar';



function AppRoutes() {
  return (
    <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Routes>
        <Route path="/" element={<FMPage />} />
        <Route path="/fm" element={<FMPage />} />
        <Route path="/frag-importer" element={<FragImporterPage />} />
        <Route path="/edificis" element={<EdificisTable />} />
        <Route path="/frag-export" element={<IfcToFragExporter />} />
        <Route path="/consultes" element={<ConsultesPage />} />
        <Route path="/config" element={<ConfigPage />} />
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
          <AppRoutes />
        </div>
      </div>
    </Router>
  );
}

export default App;
