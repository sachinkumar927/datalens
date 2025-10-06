// utils
export const notify = (msg, type = 'info', timeout = 3500) => {
  const id = 'n' + Date.now();
  const div = document.createElement('div');
  div.id = id;
  div.className = `toast align-items-center text-bg-${type} border-0`;
  div.role = 'alert';
  div.innerHTML = `<div class="d-flex"><div class="toast-body small">${msg}</div><button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
  document.getElementById('notif').appendChild(div);
  const t = new bootstrap.Toast(div);
  t.show();
  if (timeout) setTimeout(() => t.hide(), timeout);
};
