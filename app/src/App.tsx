import { useEffect, useState } from 'react';
import { useRoute } from './nav';
import { Home } from './screens/Home';
import { Guest } from './screens/Guest';
import { Insights } from './screens/Insights';
import { Teach } from './screens/Teach';
import { Settings } from './screens/Settings';
import { DevBenchmark } from './screens/DevBenchmark';
import { DevParity } from './screens/DevParity';
import { Landing } from './screens/Landing';
import { PinGate } from './components/PinGate';
import { BottomNav, ToastHost } from './components/ui';
import { processPending } from './ml/process';

const installed = () => matchMedia('(display-mode: standalone)').matches;

export function App() {
  const route = useRoute();
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => {
    processPending();
  }, []);
  // Re-lock Noor's screens whenever the phone is handed to a guest.
  useEffect(() => {
    if (route.startsWith('/guest')) setUnlocked(false);
  }, [route]);

  // First visit in a browser tab (no hash) shows the English landing page; the installed app opens straight to Home.
  if (route === '/landing' || (!location.hash && !installed())) return <><Landing /><ToastHost /></>;
  if (route.startsWith('/guest')) return <><Guest /><ToastHost /></>;
  // Noor's screens sit behind the optional PIN (spec §10).
  const noor = (() => {
    if (route.startsWith('/insights')) return <Insights />;
    if (route.startsWith('/teach')) return <Teach route={route} />;
    if (route.startsWith('/settings')) return <Settings />;
    if (route.startsWith('/dev/benchmark')) return <DevBenchmark />;
    if (route.startsWith('/dev/parity')) return <DevParity />;
    return <Home />;
  })();
  return (
    <>
      {unlocked ? noor : <PinGate onUnlock={() => setUnlocked(true)}>{noor}</PinGate>}
      {unlocked && <BottomNav route={route} />}
      <ToastHost />
    </>
  );
}
