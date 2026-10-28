const form = document.querySelector('form');
const input = document.querySelector('#password');
const button = form.querySelector('button');
const status = document.querySelector('#login-error');
input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, ''); });

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (button.disabled) return;
  button.disabled = input.disabled = true;
  status.textContent = '너만의 공간을 여는 중이에요…';
  let stage = 'download';
  let moduleUrl;
  try {
    const response = await fetch('./game.enc?v=9bba1a051da0');
    if (!response.ok) throw new Error('Download failed');
    const payload = new Uint8Array(await response.arrayBuffer());
    if (new TextDecoder().decode(payload.slice(0, 4)) !== 'MB01') throw new Error('Invalid payload');
    stage = 'decrypt';
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(input.value), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: payload.slice(4, 20), iterations: 310000, hash: 'SHA-256' },
      material, { name: 'AES-GCM', length: 256 }, false, ['decrypt'],
    );
    const compressed = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: payload.slice(20, 32) }, key, payload.slice(32));
    stage = 'start';
    input.value = '';
    const javascript = await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    moduleUrl = URL.createObjectURL(new Blob([javascript], { type: 'text/javascript' }));
    await import(moduleUrl);
  } catch (error) {
    input.value = '';
    status.textContent = stage === 'decrypt' && error.name === 'OperationError'
      ? '비밀번호가 달라요. 다시 입력해 주세요.'
      : stage === 'download'
        ? '연결을 확인한 뒤 다시 시도해 주세요.'
        : '최신 Safari 또는 Chrome에서 다시 열어 주세요.';
    button.disabled = input.disabled = false;
    input.focus();
  } finally {
    if (moduleUrl) URL.revokeObjectURL(moduleUrl);
  }
});
