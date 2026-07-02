// Crawlere AI permise explicit — vrem ca ChatGPT/Claude/Perplexity/Gemini
// să ne descopere, indexeze și citeze corect.
const AI_BOTS = [
  'GPTBot',            // OpenAI — indexare
  'OAI-SearchBot',     // OpenAI — search
  'ChatGPT-User',      // OpenAI — fetch la cererea userului
  'ClaudeBot',         // Anthropic — indexare
  'Claude-User',       // Anthropic — fetch la cererea userului
  'Claude-SearchBot',  // Anthropic — search
  'anthropic-ai',      // Anthropic (legacy)
  'PerplexityBot',     // Perplexity — indexare
  'Perplexity-User',   // Perplexity — fetch la cererea userului
  'Google-Extended',   // Google Gemini / Vertex
  'Applebot-Extended', // Apple Intelligence
  'Amazonbot',
  'Bytespider',
  'CCBot',             // Common Crawl (folosit de multe modele)
  'cohere-ai',
  'DuckAssistBot',
  'MistralAI-User',
  'meta-externalagent',
];

const DISALLOW = ['/admin/', '/dashboard/', '/api/', '/pending', '/first-login', '/studio/'];

export default function robots() {
  return {
    rules: [
      // Regula generală (toate crawlerele, inclusiv Google/Bing)
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      // Crawlerele AI — allow explicit pe conținutul public
      { userAgent: AI_BOTS, allow: '/', disallow: DISALLOW },
    ],
    sitemap: 'https://qrphotodrop.com/sitemap.xml',
    host: 'https://qrphotodrop.com',
  };
}
