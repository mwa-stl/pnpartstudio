// src/models/NewsletterCampaign.js
import mongoose, { Schema } from "mongoose";

const ScheduleSchema = new Schema(
  {
    type: { type: String, enum: ["now", "once", "weekly", "monthly", "cron"], required: true },
    when: { type: Date },                  // once
    weekly: { dow: Number, time: String }, // 0-6, "HH:MM"
    monthly: { dom: Number, time: String },// 1-31, "HH:MM"
    cron: { type: String }                 // raw expression
  },
  { _id: false }
);

const NewsletterCampaignSchema = new Schema(
  {
    subject: { type: String, required: true },
    headerHtml: { type: String, default: "" },
    bodyHtml: { type: String, default: "" },
    footerHtml: { type: String, default: "" },
    imageUrl: { type: String, default: null },
    schedule: { type: ScheduleSchema, required: true },
    status: { type: String, enum: ["draft", "scheduled", "sent", "paused"], default: "draft" },
    sentCount: { type: Number, default: 0 },
    failCount: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export default mongoose.model("NewsletterCampaign", NewsletterCampaignSchema);
