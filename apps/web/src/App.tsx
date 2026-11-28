import { useEffect, useRef, useState } from 'react';
import { VibeOS } from './VibeOS';
import { HouseFlowPanel } from './HouseFlowPanel';
import { LegacyDashboard } from './LegacyDashboard';

/*
 * Two levels, one door each.
 *
 * The main view is the Vibe OS chat. The full instrument panel is mounted only
 * when asked for. The chat stays mounted but hidden while the dashboard is open
 * so a user's draft and conversation survive the view switch; its health probe
 * is paused in that state.
 */
export function App() {
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (!hasNavigated.current) {
      hasNavigated.current = true;
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(dashboardOpen ? 'experience-mode-dashboard' : 'experience-mode-vibe')
        ?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [dashboardOpen]);

  return (
    <>
      <div hidden={dashboardOpen} aria-hidden={dashboardOpen}>
        <VibeOS active={!dashboardOpen} onOpenDashboard={() => setDashboardOpen(true)} />
        <HouseFlowPanel />
      </div>
      {dashboardOpen && <LegacyDashboard onClose={() => setDashboardOpen(false)} />}
    </>
  );
}

export default App;
