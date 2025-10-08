import React, { useState } from 'react';
import { Navigation, availableComponents, BOMRuleEngineDemo, QpaRefDesApiDemo } from '../components';
import './App.css';

function App() {
  const [activeComponent, setActiveComponent] = useState(availableComponents[0].id);

  const renderActiveComponent = () => {
    switch (activeComponent) {
      case 'bom-rule-engine':
        return <BOMRuleEngineDemo />;
      case 'qpa-refdes-api':
        return <QpaRefDesApiDemo />;
      default:
        return <BOMRuleEngineDemo />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
      <Navigation 
        activeComponent={activeComponent} 
        onComponentChange={setActiveComponent} 
      />
      
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '0 1rem' 
      }}>
        {renderActiveComponent()}
      </div>

      <footer style={{
        marginTop: '3rem',
        padding: '2rem 1rem',
        backgroundColor: '#f8f9fa',
        borderTop: '1px solid #dee2e6',
        textAlign: 'center',
        color: '#6c757d',
        fontSize: '0.85rem',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <p style={{ margin: '0 0 0.5rem 0' }}>
            🔧 BOM Validation Demo Suite - Showcasing different rule engine approaches
          </p>
          <p style={{ margin: '0', fontSize: '0.75rem' }}>
            Built with React, TypeScript, and custom rule engines
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;