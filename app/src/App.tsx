import { useEffect, useState } from 'react';
import { useRoute } from './nav';
import { Home } from './screens/Home';
import { Guest } from './screens/Guest';
import { Insights } from './screens/Insights';
import { Teach } from './screens/Teach';
import { Settings } from './screens/Settings';
import { DevBenchmark } from './screens/DevBenchmark';
import { DevParity } from './screens/DevParity';
import { PinGate } from './components/PinGate';
import { processPending } from './ml/process';

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

  if (route.startsWith('/guest')) return <Guest />;
  // Noor's screens sit behind the optional PIN (spec §10).
  const noor = (() => {
    if (route.startsWith('/insights')) return <Insights />;
    if (route.startsWith('/teach')) return <Teach route={route} />;
    if (route.startsWith('/settings')) return <Settings />;
    if (route.startsWith('/dev/benchmark')) return <DevBenchmark />;
    if (route.startsWith('/dev/parity')) return <DevParity />;
    return <Home />;
  })();
  return unlocked ? noor : <PinGate onUnlock={() => setUnlocked(true)}>{noor}</PinGate>;
}
