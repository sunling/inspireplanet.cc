const secret = process.env.NEWSLETTER_AUTOMATION_SECRET;
if (!secret || secret.length < 32) throw Error('Missing automation secret');
const base = 'https://inspireplanet.cc/.netlify/functions/';
async function call(endpoint, body) {
  const res = await fetch(base + endpoint, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(60000),
    headers: { Authorization: 'Bearer ' + secret, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw Error(endpoint + ' failed: HTTP ' + res.status);
  return data;
}
let failures = 0;
try { await call('newsletterSchedule', {action:'discover'}); }
catch (e) { console.error(e.message); failures++; }
const {tasks} = await call('newsletterSchedule', {action:'queue'});
for (const task of tasks) {
  try {
    const advanced = await call('newsletterSchedule', {action:'advance',id:task.id});
    if (advanced.status !== 'sending') continue;
    // First batch may safely reclaim an interrupted delivery; subsequent batches
    // only process pending rows, never spin on a failed recipient.
    for (let i = 0; i < 300; i++) {
      const r = await call('newsletterCampaign', {functionName:'process',year:task.year,episode:task.episode,retry:i===0});
      if (!r.data.counts.pending) {
        if (r.data.campaign?.status === 'completed')
          await call('newsletterSchedule', {action:'advance',id:task.id});
        else console.warn('Episode',task.year,task.episode,'has remaining failures or leases; inspect status');
        break;
      }
      if (i===299) throw Error('Batch safety limit reached');
    }
  } catch(e) { console.error('Episode',task.year,task.episode,e.message); failures++; }
}
if(failures) process.exitCode=1;
