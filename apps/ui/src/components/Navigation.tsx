import React from 'react';

export interface NavigationProps {
  activeComponent: string;
  onComponentChange: (component: string) => void;
}

export interface ComponentInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const availableComponents: ComponentInfo[] = [
  {
    id: 'bom-rule-engine',
    name: 'BOM Rule Engine Demo',
    description: 'Local BOM validation rules using cm-rule-engine',
    icon: '🔧',
  },
  {
    id: 'qpa-refdes-api',
    name: 'QPA RefDes API Demo',
    description: 'Dynamic QPA RefDes rules loaded from API',
    icon: '🌐',
  },
];

export function Navigation({ activeComponent, onComponentChange }: NavigationProps) {
  return (
    <nav style={{
      backgroundColor: '#f8f9fa',
      borderBottom: '2px solid #dee2e6',
      padding: '1rem',
      marginBottom: '2rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        <h1 style={{
          margin: '0 0 1rem 0',
          color: '#343a40',
          fontSize: '1.5rem',
          fontWeight: 'bold',
        }}>
          🚀 BOM Validation Demo Suite
        </h1>
        
        <div style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
        }}>
          {availableComponents.map((component) => (
            <button
              key={component.id}
              onClick={() => onComponentChange(component.id)}
              style={{
                padding: '0.75rem 1.5rem',
                border: activeComponent === component.id ? '2px solid #007bff' : '2px solid #dee2e6',
                borderRadius: '8px',
                backgroundColor: activeComponent === component.id ? '#007bff' : 'white',
                color: activeComponent === component.id ? 'white' : '#495057',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: activeComponent === component.id ? 'bold' : 'normal',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                minWidth: '200px',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (activeComponent !== component.id) {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                  e.currentTarget.style.borderColor = '#007bff';
                }
              }}
              onMouseLeave={(e) => {
                if (activeComponent !== component.id) {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#dee2e6';
                }
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{component.icon}</span>
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                  {component.name}
                </div>
                <div style={{ 
                  fontSize: '0.75rem', 
                  opacity: 0.8,
                  lineHeight: '1.2',
                }}>
                  {component.description}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          backgroundColor: '#e9ecef',
          borderRadius: '6px',
          fontSize: '0.85rem',
          color: '#6c757d',
        }}>
          💡 <strong>Tip:</strong> Switch between different BOM validation demos using the buttons above. 
          Each demo showcases different approaches to rule validation and loading.
        </div>
      </div>
    </nav>
  );
}