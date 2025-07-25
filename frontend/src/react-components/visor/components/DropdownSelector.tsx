import React from 'react';

interface DropdownOption {
  value: string;
  label: string;
  [key: string]: any; // Para propiedades adicionales como icon, code, etc.
}

interface DropdownSelectorProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  placeholder: string;
  dataAttribute?: string;
  className?: string;
  renderSelected?: (option: DropdownOption | null) => React.ReactNode;
  renderOption?: (option: DropdownOption) => React.ReactNode;
}

const DropdownSelector: React.FC<DropdownSelectorProps> = ({
  options,
  value,
  onChange,
  isOpen,
  onToggle,
  placeholder,
  dataAttribute,
  className = "fm-dropdown-container",
  renderSelected,
  renderOption
}) => {
  const selectedOption = options.find(option => option.value === value) || null;

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    onToggle(); // Cerrar el dropdown
  };

  const defaultRenderSelected = (option: DropdownOption | null) => {
    if (option) {
      return <span>{option.label}</span>;
    }
    return <span style={{ color: '#999' }}>{placeholder}</span>;
  };

  const defaultRenderOption = (option: DropdownOption) => {
    return <span>{option.label}</span>;
  };

  return (
    <div 
      {...(dataAttribute && { [dataAttribute]: true })}
      className={className}
    >
      {/* Botón principal del selector */}
      <div
        onClick={onToggle}
        className="fm-search-dropdown-button"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {renderSelected ? renderSelected(selectedOption) : defaultRenderSelected(selectedOption)}
        </div>
        <span style={{ fontSize: '0.8rem', color: '#000' }}>▼</span>
      </div>

      {/* Dropdown de opciones */}
      {isOpen && (
        <div className="fm-dropdown-menu">
          {/* Opción vacía */}
          <div
            onClick={() => handleOptionClick("")}
            className="fm-dropdown-option fm-dropdown-option-empty"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
          >
            {placeholder}
          </div>
          
          {/* Opciones */}
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => handleOptionClick(option.value)}
              className="fm-dropdown-option"
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
            >
              {renderOption ? renderOption(option) : defaultRenderOption(option)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownSelector;
