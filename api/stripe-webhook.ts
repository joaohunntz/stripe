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
          from: 'Seu App <noreply@pedagoteca.io>',
          to: email,
          subject: 'Compra confirmada!',
          html: `
            <h1>Obrigado pela compra!</h1>
            <p>Seu acesso está pronto. Clique no botão abaixo:</p>
            <a href="https://seudominio.com/acesso/${session.id}" style="padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;">Acessar agora</a>
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
