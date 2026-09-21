import type { Context, Config } from '@netlify/functions';

type ChatItem = { role: 'user' | 'model'; text: string };

const systemInstruction = `Você é o Assistente FSI, atendente institucional da Fluxo Soluções Inteligentes (FSI). Responda sempre em português do Brasil, de forma objetiva, profissional e acolhedora. Explique as soluções da FSI sem inventar preços, clientes, resultados, funcionalidades concluídas ou prazos. Quando houver interesse comercial, oriente o visitante a falar com comercial@fluxosi.ong.br. Não use Markdown decorativo e mantenha respostas normalmente abaixo de 180 palavras.`;

function cleanHistory(value: unknown): ChatItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-8).flatMap((item: any) => {
    if (!item || (item.role !== 'user' && item.role !== 'model') || typeof item.text !== 'string') return [];
    const text = item.text.trim().slice(0, 1200);
    return text ? [{ role: item.role, text }] : [];
  });
}

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Método não permitido.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = Netlify.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ message: 'Assistente temporariamente indisponível.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const payload = await req.json().catch(() => ({} as any)) as any;
  const message = typeof payload?.message === 'string' ? payload.message.trim().slice(0, 700) : '';
  if (!message) {
    return new Response(JSON.stringify({ message: 'Escreva uma mensagem.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const history = cleanHistory(payload.history);
  const contents = [
    ...history.map(item => ({ role: item.role, parts: [{ text: item.text }] })),
    { role: 'user', parts: [{ text: message }] },
  ];

  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: { maxOutputTokens: 600 },
      }),
    },
  );

  if (!response.ok) {
    return new Response(JSON.stringify({ message: 'Assistente temporariamente indisponível.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const data: any = await response.json();
  const answer = data?.candidates?.[0]?.content?.parts
    ?.map((part: any) => part.text ?? '')
    .join('')
    .trim() ?? '';

  if (!answer) {
    return new Response(JSON.stringify({ message: 'Assistente temporariamente indisponível.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return Response.json({ answer, provider: 'gemini' });
};

export const config: Config = { path: '/api/assistant' };
