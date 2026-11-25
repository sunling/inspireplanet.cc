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
const mode = process.argv[2] || '--live';
if (mode === '--test-reminder' || mode === '--test-newsletter') {
  const action = mode === '--test-reminder' ? 'testReminder' : 'testNewsletter';
  const requestId = process.env.GITHUB_RUN_ID;
  const testAt = process.env.NEWSLETTER_TEST_AT;
  if (!requestId || !testAt) throw Error('Missing test run metadata');
  const result = await call('newsletterSchedule', {action, requestId, testAt});
  if (result.testMode !== action || result.emailsSent !== 1 || result.writesPerformed !== 0 || !result.providerAccepted)
    throw Error('Unexpected test response');
  console.log(JSON.stringify(result, null, 2));
} else if (mode === '--dry-run') {
  const report = await call('newsletterSchedule', {action:'dryRun'});
  if (report.dryRun !== true || report.writesPerformed !== 0 || report.emailsSent !== 0)
    throw Error('Unexpected dry-run response');
  console.log(JSON.stringify(report, null, 2));
  if (!report.databaseReadable || !report.resendConfigured || !report.unsubscribeSecretConfigured)
    process.exitCode = 1;
} else if (mode === '--live') {
let failures = 0;
const {tasks, discovery, discoveryFailed} = await call('newsletterSchedule', {action:'tick'});
console.log('Discovery:', JSON.stringify(discovery || null));
if (discoveryFailed) { console.error('Discovery failed; existing tasks will still be processed'); failures++; }
if (!tasks.length) console.log('No pending automatic campaigns; exiting without rendering or sending additional emails.');
for (const task of tasks) {
  try {
    let advanced = await call('newsletterSchedule', {action:'advance',id:task.id});
    const wait = Date.parse(advanced.dueAt || '') - Date.now();
    if (advanced.status === 'draft' && wait > 0 && wait <= 10 * 60000) {
      await new Promise(resolve => setTimeout(resolve, wait + 2000));
      advanced = await call('newsletterSchedule', {action:'advance',id:task.id});
    }
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
} else { throw Error('Unknown newsletter mode'); }
