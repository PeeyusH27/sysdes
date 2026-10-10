// Short polling that pauses while the tab is hidden (the source polled forever)
export function startPolling(fn, ms = 5_000) {
  let timer, stopped = false;
  const tick = async () => {
    if (!document.hidden) await fn().catch(() => {});   // one failed poll shouldn't end polling
    if (!stopped) timer = setTimeout(tick, ms);          // schedule after the reply, so polls never overlap
  };
  tick();
  return () => { stopped = true; clearTimeout(timer); };   // also stops a poll that is still in flight
}
