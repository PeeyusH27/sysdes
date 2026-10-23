// robots.txt in 30 lines: the rules for our user agent (or for *), the longest matching path wins,
// and Allow beats Disallow on a tie. Crawl-delay (seconds) feeds the frontier's per-host delay.
export function parseRobots(text, agent = 'mycrawler') {
  const groups = [];                       // { agents: [], rules: [{ allow, path }], delay }
  let cur = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const i = line.indexOf(':');
    if (i < 0) continue;
    const key = line.slice(0, i).trim().toLowerCase();
    const val = line.slice(i + 1).trim();
    if (key === 'user-agent') {
      if (!cur || !lastWasAgent) { cur = { agents: [], rules: [], delay: null }; groups.push(cur); }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!cur) continue;
    if (key === 'allow' || key === 'disallow') {
      if (val) cur.rules.push({ allow: key === 'allow', path: val });   // "Disallow:" with nothing allows everything
    } else if (key === 'crawl-delay') {
      cur.delay = Number(val) || null;
    }
  }
  const mine = groups.find((g) => g.agents.includes(agent.toLowerCase())) ?? groups.find((g) => g.agents.includes('*'));
  const rules = mine?.rules ?? [];
  return {
    crawlDelaySec: mine?.delay ?? null,
    allowed(path) {
      let best = null;
      for (const r of rules) {
        if (!path.startsWith(r.path)) continue;
        if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
      }
      return best ? best.allow : true;     // no matching rule means allowed
    },
  };
}
