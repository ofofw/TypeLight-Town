import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppController } from './app/controller';
import { App } from './ui/App';
import { ErrorBoundary } from './ui/components/ErrorBoundary';
import { ControllerContext } from './ui/hooks';
import './styles/fonts.css';
import './styles/global.css';
import './styles/phase2.css';

async function bootstrap(): Promise<void> {
  const root = createRoot(document.getElementById('root')!);

  // dev-only 3D 风格门验收页：?demo3d 查询参数进入，动态加载不进生产包。
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo3d')) {
    const { Town3DDemo } = await import('./three/DemoPage');
    root.render(
      <StrictMode>
        <Town3DDemo />
      </StrictMode>,
    );
    return;
  }

  const controller = new AppController();
  controller.init();
  controller.attach();

  root.render(
    <StrictMode>
      <ErrorBoundary>
        <ControllerContext.Provider value={controller}>
          <App />
        </ControllerContext.Provider>
      </ErrorBoundary>
    </StrictMode>,
  );
}

void bootstrap();
