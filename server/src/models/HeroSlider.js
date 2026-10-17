import mongoose from 'mongoose';
import { mediaCleanupPlugin } from '../services/mediaCleanup.js';

const heroSliderSchema = new mongoose.Schema({
  image: { type: String, required: true },
  alt: { type: String, required: true },
  eyebrow: { type: String },
  heading: { type: String, required: true },
  sub: { type: String },
  ctaLabel: { type: String, required: true },
  ctaHref: { type: String, required: true }
}, { timestamps: true });

// Files this record stops referencing (replaced, removed, or the record deleted) are removed from the bucket.
heroSliderSchema.plugin(mediaCleanupPlugin, { fields: ['image'] });

const HeroSlider = mongoose.model('HeroSlider', heroSliderSchema);
export default HeroSlider;
