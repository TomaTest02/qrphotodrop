import Stripe from 'stripe';

let _stripe;
export function getStripe() {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}
// Keep backward compat
export const stripe = { get checkout() { return getStripe().checkout; }, get webhooks() { return getStripe().webhooks; } };

export const PACKAGES = {
  nunta: {
    intim:   { price: 27900, label: 'Nuntă Intimă',   guests: 100 },
    complet: { price: 36900, label: 'Nuntă Completă', guests: 250 },
    vis:     { price: 55900, label: 'Nuntă de Vis',   guests: 500 },
  },
  botez: {
    intim:   { price: 24900, label: 'Botez Intim',    guests: 50  },
    complet: { price: 32900, label: 'Botez Complet',  guests: 150 },
    vis:     { price: 48900, label: 'Botez de Vis',   guests: 300 },
  },
  aniversare: {
    intim:   { price: 24900, label: 'Aniversare Intimă',   guests: 50  },
    complet: { price: 32900, label: 'Aniversare Completă', guests: 150 },
    vis:     { price: 48900, label: 'Aniversare de Vis',   guests: 300 },
  },
  corporate: {
    intim:   { price: 32900, label: 'Corporate Basic',    guests: 100 },
    complet: { price: 45900, label: 'Corporate Standard', guests: 300 },
    vis:     { price: 69900, label: 'Corporate Premium',  guests: 600 },
  },
};
