/**
 * Public pages required for App Store / Play Store listings:
 *   GET /privacy          - Privacy Policy URL
 *   GET /terms            - Terms of Use (EULA incl. objectionable-content rules, guideline 1.2)
 *   GET /support          - Support URL
 *   GET /email-confirmed  - landing page for the signup confirmation link
 *
 * Served by the gateway so they work on the Railway URL until giga-giga.com is live.
 * DRAFT legal text: have it reviewed before relying on it.
 */
import { Request, Response, Router } from 'express';

const router: Router = Router();

const SUPPORT_EMAIL = 'support@giga-giga.com';
const LAST_UPDATED = '7 October 2026';

const page = (title: string, body: string): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · Giga</title>
<style>
  :root { color-scheme: light dark; --fg:#1a1a1a; --muted:#5c5c5c; --bg:#ffffff; --accent:#0b6bcb; --rule:#e5e5e5; }
  @media (prefers-color-scheme: dark) { :root { --fg:#ececec; --muted:#a3a3a3; --bg:#121212; --accent:#5aa8f0; --rule:#2c2c2c; } }
  body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  main { max-width:720px; margin:0 auto; padding:32px 16px 64px; }
  h1 { font-size:1.8rem; margin:0 0 4px; }
  h2 { font-size:1.15rem; margin:32px 0 8px; padding-top:16px; border-top:1px solid var(--rule); }
  .muted { color:var(--muted); font-size:.9rem; }
  a { color:var(--accent); }
  li { margin:4px 0; }
  nav { margin-bottom:24px; font-size:.9rem; }
  nav a { margin-right:16px; }
</style>
</head>
<body><main>
<nav><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/support">Support</a></nav>
${body}
</main></body>
</html>`;

const privacy = page(
  'Privacy Policy',
  `<h1>Privacy Policy</h1>
<p class="muted">Last updated ${LAST_UPDATED}</p>
<p>Giga ("we", "us") provides a social, rides, delivery, hotel and shopping platform through the Giga mobile apps and website. This policy explains what personal information we collect, how we use it, and the choices you have.</p>

<h2>Information we collect</h2>
<ul>
  <li><strong>Account information:</strong> name, email address, phone number and password (stored only as a secure hash by our authentication provider).</li>
  <li><strong>Profile information you choose to add:</strong> photo, date of birth, gender and interests.</li>
  <li><strong>Location:</strong> your device location while you request or provide a ride or delivery, and to show nearby hotels and services. You can turn off location access in your device settings, but ride and delivery features need it to work.</li>
  <li><strong>Transactions:</strong> orders, bookings, rides, wallet activity and payment status. Card payments are processed by Paystack and Stripe; we never receive or store your full card number.</li>
  <li><strong>Content you post:</strong> posts, photos, comments, stories and messages, plus reports and blocks you make.</li>
  <li><strong>Device and diagnostic data:</strong> device type, operating system, app version, IP address, and crash and error reports, used to keep the service secure and working.</li>
</ul>

<h2>How we use it</h2>
<ul>
  <li>To create and secure your account and provide the features you use (matching riders with drivers, delivering orders, confirming bookings).</li>
  <li>To process payments, refunds and payouts, and to prevent fraud.</li>
  <li>To send service messages such as confirmations, receipts and security alerts by email, SMS or push notification. Marketing messages are sent only if you opt in, and you can opt out at any time.</li>
  <li>To moderate content, act on reports and enforce our <a href="/terms">Terms of Use</a>.</li>
  <li>To diagnose problems and improve the service.</li>
</ul>
<p>We do not sell your personal information, and we do not use it to track you across other companies' apps or websites.</p>

<h2>Who we share it with</h2>
<ul>
  <li><strong>Other users, as needed for a service:</strong> for example, a driver sees your pickup point and first name; a hotel host sees your booking details; your public profile and posts are visible to other users as you choose.</li>
  <li><strong>Service providers</strong> that run parts of Giga for us under contract: cloud hosting and database (Supabase, Railway), payments (Paystack, Stripe), messaging (email, SMS and push notification providers) and error monitoring (Sentry).</li>
  <li><strong>Authorities,</strong> when required by law or to protect the safety of our users.</li>
</ul>

<h2>How long we keep it</h2>
<p>We keep your information while your account is active. You can delete your account at any time in the app under <strong>Settings → Delete account</strong>. Deletion takes effect immediately: you are signed out everywhere and your profile, posts and listings are removed from the platform. Within 30 days we permanently delete or anonymise your personal information, except records we must keep by law (for example payment and tax records), which are retained only for the period the law requires.</p>

<h2>Your rights</h2>
<p>Depending on where you live (including under Nigeria's Data Protection Act 2023 and the GDPR), you can ask to access, correct, export or delete your personal information, or object to how we use it. Most of this can be done in the app; for anything else email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>. We respond within 30 days.</p>

<h2>Security</h2>
<p>Data is encrypted in transit, access is restricted to staff who need it, and passwords are never stored in readable form. No system is perfectly secure, so please use a strong, unique password.</p>

<h2>Children</h2>
<p>Giga is not intended for children under 16, and we do not knowingly collect their information. If you believe a child has created an account, contact us and we will delete it.</p>

<h2>Changes</h2>
<p>If we change this policy we will update the date above, and notify you in the app for significant changes.</p>

<h2>Contact</h2>
<p><a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>`
);

const terms = page(
  'Terms of Use',
  `<h1>Terms of Use</h1>
<p class="muted">Last updated ${LAST_UPDATED}</p>
<p>These terms are an agreement between you and Giga. By creating an account or using Giga you accept them. If you do not agree, do not use the service.</p>

<h2>Your account</h2>
<ul>
  <li>You must be at least 16 years old and give accurate information.</li>
  <li>You are responsible for activity on your account; keep your password private.</li>
  <li>You can delete your account at any time in the app.</li>
</ul>

<h2>Zero tolerance for objectionable content and abusive users</h2>
<p>Giga has <strong>no tolerance for objectionable content or abusive behaviour</strong>. You must not post, send or share content that:</p>
<ul>
  <li>harasses, bullies, threatens or intimidates anyone;</li>
  <li>is hateful or discriminatory on the basis of race, ethnicity, religion, gender, sexual orientation, disability or similar characteristics;</li>
  <li>is sexually explicit, or sexualises minors in any way;</li>
  <li>promotes violence, self-harm, terrorism or illegal activity;</li>
  <li>is spam, a scam, impersonation, or deliberately false information;</li>
  <li>infringes someone else's copyright, trademark or privacy.</li>
</ul>
<p>Every post, comment and profile can be <strong>reported</strong> from the app, and you can <strong>block</strong> any user so that you no longer see each other's content. Our moderators review reports within 24 hours. We remove content that breaks these rules and suspend or permanently remove the accounts of users who post it.</p>

<h2>Rides, deliveries, stays and purchases</h2>
<p>Drivers, couriers, hosts and vendors on Giga are independent providers. Giga connects you with them and processes payments, but the provider is responsible for the service they deliver. Prices, cancellation and refund terms are shown before you confirm. Report any problem with a trip, order or stay through the app or to support.</p>

<h2>Payments</h2>
<p>Payments are processed by our payment partners. By paying you authorise the charge shown at checkout. Refunds follow the policy shown for that service and are returned to the original payment method or your Giga wallet.</p>

<h2>Your content</h2>
<p>You keep ownership of what you post. You give Giga a licence to host, display and distribute it within the service so that the people you share it with can see it. We may remove content that breaks these terms.</p>

<h2>Suspension and termination</h2>
<p>We may suspend or close accounts that break these terms, endanger other users or misuse the platform. You can stop using Giga and delete your account at any time.</p>

<h2>Disclaimers and liability</h2>
<p>Giga is provided "as is". To the extent the law allows, we are not liable for indirect or consequential losses, or for the acts of independent providers or other users. Nothing in these terms limits rights you have under consumer protection law.</p>

<h2>Changes</h2>
<p>We may update these terms; the date above shows the latest version, and we will tell you in the app about significant changes.</p>

<h2>Governing law and contact</h2>
<p>These terms are governed by the laws of the Federal Republic of Nigeria. Questions: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>`
);

const support = page(
  'Support',
  `<h1>Giga Support</h1>
<p>Need help? Email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> and we will reply within one business day.</p>

<h2>Common questions</h2>
<p><strong>How do I delete my account?</strong><br>In the app, open Settings → Delete account and confirm with your password. You are signed out immediately and your profile and posts are removed. If you have an active ride, order, booking or delivery, finish or cancel it first.</p>
<p><strong>How do I report a post, comment or user?</strong><br>Tap the ⋯ menu on the post, comment or profile and choose Report. Our team reviews every report within 24 hours.</p>
<p><strong>How do I block someone?</strong><br>Open their profile, tap ⋯ and choose Block. You will no longer see each other's posts, comments or stories, and they cannot comment on your posts or send you connection requests.</p>
<p><strong>I didn't get my confirmation or password reset email.</strong><br>Check your spam folder, wait a few minutes and try again. If it still doesn't arrive, email us from the address you signed up with.</p>
<p><strong>A problem with a ride, delivery, order or stay?</strong><br>Report it from the trip, order or booking screen in the app, or email us with the reference number.</p>

<h2>Policies</h2>
<p><a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Use</a></p>`
);

const emailConfirmed = page(
  'Email confirmed',
  `<h1>Your email is confirmed</h1>
<p>Thanks for confirming your email address. Return to the Giga app and sign in to continue.</p>
<p class="muted">If you did not create a Giga account, you can ignore this page or contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>`
);

const send = (html: string) => (_req: Request, res: Response) => {
  res.set('Cache-Control', 'public, max-age=300').type('html').send(html);
};

router.get('/privacy', send(privacy));
router.get('/terms', send(terms));
router.get('/support', send(support));
router.get('/email-confirmed', send(emailConfirmed));

export const legalRouter: Router = router;
