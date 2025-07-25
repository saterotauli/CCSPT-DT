import React from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationsIcon from '@mui/icons-material/Notifications';

const ConfigHeader: React.FC = () => {
  const navigate = useNavigate();
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '0 32px',
      background: '#007EB0',
      borderBottom: '1px solid #007EB0',
      width: '100%',
      height: 56,
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
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

const ConfigPage: React.FC = () => {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ConfigHeader />
      <div style={{ flex: 1, padding: 32, background: '#f8f9fa' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 12px #0001', padding: 32 }}>
          <h2 style={{ marginBottom: 24, color: '#333' }}>Configuració</h2>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 20 }}>Pàgina de configuració del sistema.</p>
          
          <div style={{ 
            background: '#f0f8ff', 
            padding: 16, 
            borderRadius: 4, 
            marginTop: 20,
            border: '1px solid #007EB0'
          }}>
            <p style={{ margin: 0, color: '#007EB0' }}>
              ✓ Aquesta és la única pàgina amb el header de navegació superior
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigPage;
