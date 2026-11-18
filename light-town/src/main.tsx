import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppController } from './app/controller';
import { App } from './ui/App';
import { ErrorBoundary } from './ui/components/ErrorBoundary';
import { ControllerContext } from './ui/hooks';
import './styles/fonts.css';
import './styles/global.css';
import './styles/phase2.css';

const controller = new AppController();
controller.init();
controller.attach();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ControllerContext.Provider value={controller}>
        <App />
      </ControllerContext.Provider>
    </ErrorBoundary>
  </StrictMode>,
);
