import PendingContent from './PendingContent';

// Server component. În Next.js 16 `searchParams` este un Promise → se await-uiește.
// Citim ?suspended=1 aici, pe server, și trimitem un simplu prop mai jos —
// fără useSearchParams, fără Suspense, fără setState în useEffect.
export default async function PendingPage({ searchParams }) {
  const params = await searchParams;
  const suspended = params?.suspended === '1';

  return <PendingContent suspended={suspended} />;
}
