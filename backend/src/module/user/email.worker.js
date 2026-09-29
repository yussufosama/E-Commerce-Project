import { EmailJob } from '../../database/model/email-job.model.js';
import { createRecoveryService } from './recovery.service.js';
import { mailConfigured } from '../../config/mail.js';

export function startEmailWorker() {
  const service = createRecoveryService();
  let running = null;
  async function deliver() {
    if (!mailConfigured()) return;
    const job = await EmailJob.findOneAndUpdate({ availableAt: { $lte: new Date() }, expiresAt: { $gt: new Date() }, attempts: { $lt: 3 } },
      { $inc: { attempts: 1 }, $set: { availableAt: new Date(Date.now() + 60000) } }, { sort: { createdAt: 1 }, returnDocument: 'after' });
    if (!job) return;
    try { await service.requestEmail(job.email, job.purpose); await EmailJob.deleteOne({ _id: job._id }); }
    catch { console.error('Account email job could not be delivered; queued for bounded retry.'); }
  }
  const timer = setInterval(() => {
    if (!running) running = deliver().catch(() => console.error('Email worker unavailable.')).finally(() => { running = null; });
  }, 2000);
  timer.unref();
  return async () => { clearInterval(timer); if (running) await running; };
}
