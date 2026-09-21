import './styles.css';
const api = {
  post: async (url: string, data?: unknown) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data ?? {}),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof body?.message === 'string' ? body.message : 'request_failed');
    return { data: body };
  },
};

const menuButton = document.querySelector<HTMLButtonElement>('.menu-toggle');
const mainNav = document.querySelector<HTMLElement>('#main-nav');

menuButton?.addEventListener('click', () => {
  const isOpen = mainNav?.classList.toggle('open') ?? false;
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
});

mainNav?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Abrir menu');
  });
});

const revealItems = document.querySelectorAll<HTMLElement>('[data-reveal]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (reducedMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach(item => item.classList.add('is-visible'));
} else {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });
  revealItems.forEach(item => revealObserver.observe(item));
}

const form = document.querySelector<HTMLFormElement>('#contact-form');
const status = document.querySelector<HTMLParagraphElement>('#form-status');

form?.addEventListener('submit', async event => {
  event.preventDefault();
  const name = document.querySelector<HTMLInputElement>('#contact-name');
  const email = document.querySelector<HTMLInputElement>('#contact-email');
  const subject = document.querySelector<HTMLSelectElement>('#contact-subject');
  const message = document.querySelector<HTMLTextAreaElement>('#contact-message');
  const consent = document.querySelector<HTMLInputElement>('#contact-consent');
  const website = document.querySelector<HTMLInputElement>('#contact-website');
  const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!name?.value.trim() || !email?.value.trim() || !email.validity.valid || !consent?.checked) {
    if (status) {
      status.textContent = 'Preencha nome, e-mail válido e aceite a Política de Privacidade para enviar.';
      status.className = 'form-status error';
    }
    return;
  }
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Enviando…';
  }
  if (status) {
    status.textContent = 'Registrando seu contato…';
    status.className = 'form-status';
  }
  try {
    await api.post('/api/leads', { name: name.value.trim(), email: email.value.trim(), subject: subject?.value ?? 'Contato pelo site', message: message?.value.trim() ?? '', privacyConsent: consent.checked, website: website?.value ?? '' });
    if (status) {
      status.textContent = 'Contato recebido pela FSI. Nossa equipe comercial poderá responder pelo e-mail informado.';
      status.className = 'form-status success';
    }
    form.reset();
  } catch {
    if (status) {
      status.textContent = 'Não conseguimos registrar agora. Você também pode escrever para comercial@fluxosi.ong.br.';
      status.className = 'form-status error';
    }
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Enviar contato';
    }
  }
});

const aiLauncher = document.querySelector<HTMLButtonElement>('#ai-launcher');
const aiPanel = document.querySelector<HTMLElement>('#ai-panel');
const aiClose = document.querySelector<HTMLButtonElement>('#ai-close');
const aiForm = document.querySelector<HTMLFormElement>('#ai-form');
const aiInput = document.querySelector<HTMLTextAreaElement>('#ai-input');
const aiMessages = document.querySelector<HTMLElement>('#ai-messages');
const aiSuggestions = document.querySelector<HTMLElement>('#ai-suggestions');
let aiBusy = false;
const history: Array<{ role: 'user' | 'model'; text: string }> = [];

function setAiOpen(open: boolean) {
  if (!aiPanel || !aiLauncher) return;
  aiPanel.hidden = !open;
  aiLauncher.setAttribute('aria-expanded', String(open));
  if (open) window.setTimeout(() => aiInput?.focus(), 80);
}

function appendAiMessage(kind: 'user' | 'assistant' | 'error', text: string) {
  if (!aiMessages) return;
  const wrapper = document.createElement('div');
  wrapper.className = `ai-message ${kind}`;
  const badge = document.createElement('span');
  badge.textContent = kind === 'user' ? 'VOCÊ' : 'FSI';
  const copy = document.createElement('p');
  copy.textContent = text;
  const time = document.createElement('small');
  time.className = 'ai-message-time';
  time.textContent = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
  wrapper.append(badge, copy, time);
  aiMessages.append(wrapper);
  aiMessages.scrollTop = aiMessages.scrollHeight;
}

async function askFsiAi(message: string) {
  if (aiBusy || !message.trim()) return;
  aiBusy = true;
  aiSuggestions?.classList.add('is-hidden');
  appendAiMessage('user', message.trim());
  history.push({ role: 'user', text: message.trim() });
  if (aiInput) {
    aiInput.value = '';
    aiInput.disabled = true;
  }
  const pending = document.createElement('div');
  pending.className = 'ai-typing';
  pending.textContent = 'FSI está digitando…';
  aiMessages?.append(pending);
  try {
    const response = await api.post('/api/assistant', { message: message.trim(), history: history.slice(-8) });
    pending.remove();
    const answer = typeof response.data?.answer === 'string' ? response.data.answer.trim() : '';
    if (!answer) throw new Error('empty_answer');
    history.push({ role: 'model', text: answer });
    appendAiMessage('assistant', answer);
  } catch {
    pending.remove();
    history.pop();
    appendAiMessage('error', 'Não consegui responder agora. Tente novamente em instantes ou fale com a FSI pelo contato comercial.');
  } finally {
    aiBusy = false;
    if (aiInput) {
      aiInput.disabled = false;
      aiInput.focus();
    }
  }
}

aiLauncher?.addEventListener('click', () => setAiOpen(aiPanel?.hidden ?? true));
aiClose?.addEventListener('click', () => setAiOpen(false));
aiForm?.addEventListener('submit', event => {
  event.preventDefault();
  void askFsiAi(aiInput?.value ?? '');
});
aiInput?.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    aiForm?.requestSubmit();
  }
});
aiSuggestions?.querySelectorAll<HTMLButtonElement>('[data-ai-prompt]').forEach(button => {
  button.addEventListener('click', () => void askFsiAi(button.dataset.aiPrompt ?? ''));
});

