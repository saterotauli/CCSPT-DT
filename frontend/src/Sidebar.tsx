import React from 'react';
import HomeIcon from '@mui/icons-material/Home';
import MicrosoftIcon from '@mui/icons-material/Microsoft';
import DescriptionIcon from '@mui/icons-material/Description';
import HandymanIcon from '@mui/icons-material/Handyman';
import SettingsIcon from '@mui/icons-material/Settings';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import { useNavigate } from 'react-router-dom';

const sidebarItems = [
  { label: 'Control', icon: <MonitorHeartIcon fontSize="large" />, route: '/frag-importer' },
  { label: 'Espais', icon: <MicrosoftIcon fontSize="large" />, route: '/edificis' },
  { label: 'FM', icon: <HandymanIcon fontSize="large" />, route: '/fm' },
  { label: 'Projectes', icon: <HomeIcon fontSize="large" />, route: '/frag-export' },
  { label: 'Docs', icon: <DescriptionIcon fontSize="large" />, route: '/consultes' },
  { label: 'Consultes', icon: <QuestionAnswerIcon fontSize="large" />, route: '/consultes' },
  { label: 'Config.', icon: <SettingsIcon fontSize="large" />, route: '/config' },
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  return (
    <aside style={{
      width: 100,
      background: '#fff',
      borderRight: '1px solid #e0e0e0',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 20,
      gap: 16
    }}>
      <img src="/assets/logo_tauli_quadrat.png" alt="Logo" style={{ height: 64, marginBottom: 60 }} />
      {sidebarItems.map((item) => (
        <button
          key={item.label}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            marginBottom: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: '#007EB0',
            fontSize: 15,
            minWidth: 80
          }}
          onClick={() => navigate(item.route)}
          onMouseOver={e => (e.currentTarget.style.background = '#e3f2fd')}
          onMouseOut={e => (e.currentTarget.style.background = 'none')}
        >
          {item.icon}
          <span style={{ fontSize: 14, marginTop: 4 }}>{item.label}</span>
        </button>
      ))}
    </aside>
  );
};

export default Sidebar;
