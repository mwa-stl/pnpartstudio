import { Router } from 'express';
import classesRoutes from './classes.routes.js';
import galleryRouter from './gallery.routes.js';
import productsRouter from './products.routes.js';
import categoriesRouter from './category.routes.js';
import authRouter from './auth.routes.js';
import couponsRouter from './coupon.routes.js';
import newsletterRouter from './newsletter.routes.js';
import customOrderRouter from './custom.order.routes.js';
import contactRouter from './contact.routes.js';
import paypalRoutes from './paypal.routes.js';
import paypalWebhookRoutes from './paypal.webhook.routes.js';
import ordersRoutes from './orders.routes.js';
import testimonialsRoutes from './testimonials.routes.js';
import storePickupRoutes from './storePickup.routes.js';
import heroSliderRouter from './heroSlider.routes.js';
import artistProfileRouter from './artistProfile.routes.js';
import siteSettingsRouter from './siteSettings.routes.js';
import pageHeroRouter from './pageHero.routes.js';
import reviewRouter from './review.routes.js';
import promoPopupRouter from './promoPopup.routes.js';
import mediaRouter from './media.routes.js';
import announcementRouter from './announcement.routes.js';

const routes = Router();

routes.use('/auth', authRouter);
routes.use('/classes', classesRoutes);
routes.use('/gallery', galleryRouter);
routes.use('/products', productsRouter);
routes.use('/categories', categoriesRouter);
routes.use('/coupons', couponsRouter);
routes.use('/newsletters', newsletterRouter);
routes.use('/custom-orders', customOrderRouter);
routes.use('/contact', contactRouter);
routes.use('/paypal', paypalRoutes);
routes.use('/paypal/webhook', paypalWebhookRoutes); // PayPal webhook endpoint
routes.use('/orders', ordersRoutes);               // Orders API
routes.use('/testimonials', testimonialsRoutes);   // Testimonials API
routes.use('/store-pickup-orders', storePickupRoutes);
routes.use('/hero-sliders', heroSliderRouter);
routes.use('/artist-profile', artistProfileRouter); // Artist copy for Home + About
routes.use('/site-settings', siteSettingsRouter);   // Studio contact details
routes.use('/page-heroes', pageHeroRouter);         // Per-page masthead copy
routes.use('/reviews', reviewRouter);               // Public product reviews
routes.use('/promo-popup', promoPopupRouter);       // Welcome popup content
routes.use('/announcements', announcementRouter);   // Festival / clearance sales and their prices
routes.use('/media', mediaRouter);                  // Uploads: WebP images + compressed video on GCS

export default routes;
