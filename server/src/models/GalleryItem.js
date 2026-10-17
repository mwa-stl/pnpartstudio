// src/models/GalleryItem.js
import mongoose from 'mongoose';
import { mediaCleanupPlugin } from '../services/mediaCleanup.js';

const GalleryItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, default: 'Untitled' },
    category: { type: String, required: true, enum: ['Paintings', 'Handcrafted Items', 'Exhibitions', 'Other'], default: 'Paintings' },
    year: { type: Number, default: new Date().getFullYear(), index: true },
    medium: { type: String, default: '' },
    description: { type: String, default: '' },

    /** Image or video. Older records predate the field, hence the default. */
    type: { type: String, enum: ['image', 'video'], default: 'image', index: true },

    /** The image itself, or the MP4 for a video item. */
    src: { type: String, required: true },
    /** Object path in the bucket, so the file can be removed with the record. */
    storagePath: { type: String, default: '' },

    /** Video only: the frame shown before playback, and its length in seconds. */
    poster: { type: String, default: '' },
    posterPath: { type: String, default: '' },
    duration: { type: Number, default: 0 },

    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },

    /** Legacy — kept so pre-GCS records can still be traced back to Cloudinary. */
    cloudinaryPublicId: { type: String, default: '' },

    tags: { type: [String], default: [] }
  },
  { timestamps: true }
);

// Enable text search across key fields
GalleryItemSchema.index({ title: 'text', description: 'text', medium: 'text' });

// Files this record stops referencing (replaced, removed, or the record deleted) are removed from the bucket.
GalleryItemSchema.plugin(mediaCleanupPlugin, { fields: ['src', 'poster'] });

export default mongoose.model('GalleryItem', GalleryItemSchema);
