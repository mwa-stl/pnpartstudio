// src/models/Subscriber.js
import mongoose, { Schema } from "mongoose";

const SubscriberSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /.+\@.+\..+/
    }
  },
  { timestamps: true }
);

export default mongoose.model("Subscriber", SubscriberSchema);
