import { getStore } from '@netlify/blobs';
import type { Context, Config } from '@netlify/functions';

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Método não permitido.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ message: 'Dados inválidos.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const name = typeof payload?.name === 'string' ? payload.name.trim().slice(0, 120) : '';
  const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase().slice(0, 180) : '';
  const subject = typeof payload?.subject === 'string' ? payload.subject.trim().slice(0, 120) : '';
  const message = typeof payload?.message === 'string' ? payload.message.trim().slice(0, 1600) : '';
  const website = typeof payload?.website === 'string' ? payload.website.trim() : '';
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (website) return Response.json({ ok: true });

  if (name.length < 2 || !emailPattern.test(email)) {
    return new Response(JSON.stringify({ message: 'Informe nome e e-mail válidos.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (payload?.privacyConsent !== true) {
    return new Response(JSON.stringify({ message: 'É necessário autorizar o tratamento dos dados.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const createdAt = new Date().toISOString();
  const leadId = createdAt.replace(/\D/g, '') + '-' + crypto.randomUUID();
  const store = getStore('fsi-leads');
  await store.setJSON(leadId, {
    name,
    email,
    subject: subject || 'Contato pelo site',
    message,
    source: 'netlify-staging',
    status: 'new',
    createdAt,
  });

  return new Response(JSON.stringify({ ok: true, leadId }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const config: Config = { path: '/api/leads' };
