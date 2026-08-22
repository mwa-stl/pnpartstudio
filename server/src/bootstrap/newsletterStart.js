// src/bootstrap/newsletterStart.js
import NewsletterCampaign from "../models/NewsletterCampaign.js";
import { scheduleCampaign } from "../controllers/newsletter.controller.js";

export async function bootNewsletterScheduler() {
  const scheduled = await NewsletterCampaign.find({ status: "scheduled" }).lean();
  await Promise.all(scheduled.map(scheduleCampaign));
}
