import { buffer } from 'micro';
import Stripe from 'stripe';
import { Resend } from 'resend';
import type { NextApiRequest, NextApiResponse } from 'next';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

const resend = new Resend(process.env.RESEND_API_KEY!);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'] as string;

    const event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = session.customer_details?.email;

      if (email) {
        await resend.emails.send({
          from: 'Pedagoteca App <noreply@pedagoteca.io>',
          to: email,
          subject: 'Welcome to Pedagoteca! 🎉',
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
              <h1 style="color: #6366f1;">Welcome to Pedagoteca!</h1>
              <p>Hello, your Pedagoteca access code is ready!!</p>
              <p><strong>Your access code is:</strong> <span style="background-color:#f3f3f3; padding:4px 8px; border-radius:4px;">pedagoteca25</span></p>
              <p>Enter your name, email address used for purchase and your access code to unlock access to the application with premium features.</p>
              <a href="https://pedagoteca.io/install/"
                 style="display:inline-block; margin-top:20px; padding: 14px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                👉 CLICK HERE TO INSTALL THE APP
              </a>
              <p style="margin-top: 30px;">If you have any questions, please do not hesitate to send an email to <a href="mailto:pedagotecabrasil@gmail.com">pedagotecabrasil@gmail.com</a>.</p>
            </div>
          `,
        });
      }
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('Erro no webhook:', err.message || err);
    res.status(500).send('Webhook handler failed');
  }
}
