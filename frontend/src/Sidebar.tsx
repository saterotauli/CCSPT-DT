import React from 'react';
import HomeIcon from '@mui/icons-material/Home';
import ApartmentIcon from '@mui/icons-material/Apartment';
import StorageIcon from '@mui/icons-material/Storage';
import DescriptionIcon from '@mui/icons-material/Description';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate } from 'react-router-dom';

const sidebarItems = [
  { label: 'Projectes', icon: <HomeIcon />, route: '/visor' },
  { label: 'Espais', icon: <ApartmentIcon />, route: '/edificis' },
  { label: 'Actius', icon: <StorageIcon />, route: '/frag-importer' },
  { label: 'Documents', icon: <DescriptionIcon />, route: '/consultes' },
  { label: 'Configuració', icon: <SettingsIcon />, route: '/config' },
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  return (
    <aside style={{
      width: 72,
      background: '#fff',
      borderRight: '1px solid #e0e0e0',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 16,
      gap: 8
    }}>
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
            fontSize: 12
          }}
          onClick={() => navigate(item.route)}
          onMouseOver={e => (e.currentTarget.style.background = '#e3f2fd')}
          onMouseOut={e => (e.currentTarget.style.background = 'none')}
        >
          {item.icon}
          <span style={{ fontSize: 10, marginTop: 4 }}>{item.label}</span>
        </button>
      ))}
    </aside>
  );
};

export default Sidebar;
