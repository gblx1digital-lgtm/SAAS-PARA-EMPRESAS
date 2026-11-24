document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = document.getElementById('login-error');
  err.hidden = true;
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: document.getElementById('password').value })
  }).catch(() => null);
  const json = res ? await res.json().catch(() => ({})) : { error: 'Sem conexão com o servidor.' };
  if (res && res.ok) { window.location.href = '/'; return; }
  err.textContent = json.error || 'Não foi possível entrar.';
  err.hidden = false;
});
