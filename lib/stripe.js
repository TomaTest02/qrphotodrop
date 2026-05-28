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
    intim:   { price: 27900, label: 'Nuntă Basic',        guests: 100, storage: '25 GB', duration: '1 lună după eveniment' },
    complet: { price: 36900, label: 'Nuntă Standard',     guests: 250, storage: '60 GB', duration: '2 luni după eveniment' },
    vis:     { price: 55900, label: 'Nuntă Premium',      guests: 500, storage: '100 GB', duration: '3 luni după eveniment' },
  },
  botez: {
    intim:   { price: 24900, label: 'Botez Basic',        guests: 50,  storage: '25 GB', duration: '1 lună după eveniment'  },
    complet: { price: 32900, label: 'Botez Standard',     guests: 150, storage: '60 GB', duration: '2 luni după eveniment' },
    vis:     { price: 48900, label: 'Botez Premium',      guests: 300, storage: '100 GB', duration: '3 luni după eveniment' },
  },
  aniversare: {
    intim:   { price: 24900, label: 'Aniversare Basic',   guests: 50,  storage: '25 GB', duration: '1 lună după eveniment'  },
    complet: { price: 32900, label: 'Aniversare Standard', guests: 150, storage: '60 GB', duration: '2 luni după eveniment' },
    vis:     { price: 48900, label: 'Aniversare Premium',  guests: 300, storage: '100 GB', duration: '3 luni după eveniment' },
  },
  corporate: {
    intim:   { price: 32900, label: 'Corporate Basic',    guests: 100, storage: '25 GB', duration: '1 lună după eveniment' },
    complet: { price: 45900, label: 'Corporate Standard', guests: 300, storage: '60 GB', duration: '2 luni după eveniment' },
    vis:     { price: 69900, label: 'Corporate Premium',  guests: 600, storage: '100 GB', duration: '3 luni după eveniment' },
  },
};
