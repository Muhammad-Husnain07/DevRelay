const ScheduledJobRun = require('../../models/ScheduledJobRun');
const cron = require('node-cron');

const evaluate = async (workspaceId, windowMinutes = 60) => {
  const since = new Date(Date.now() - windowMinutes * 60000);

  const recentRuns = await ScheduledJobRun.find({
    workspaceId,
    createdAt: { $gte: since },
    status: 'success'
  }).select('scheduledJobId triggeredAt').sort({ triggeredAt: -1 });

  let missedCount = 0;
  const latestByJob = {};
  for (const run of recentRuns) {
    const key = run.scheduledJobId.toString();
    if (!latestByJob[key]) latestByJob[key] = run;
  }

  for (const [, run] of Object.entries(latestByJob)) {
    const triggerTime = new Date(run.triggeredAt).getTime();
    const now = Date.now();
    if (now - triggerTime > windowMinutes * 60000) {
      missedCount++;
    }
  }

  return missedCount;
};

module.exports = { evaluate };