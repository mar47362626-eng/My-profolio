const messageList = document.querySelector('#message-list');
const messageCount = document.querySelector('#message-count');
const clearMessages = document.querySelector('#clear-messages');
const apiBaseUrl = 'https://my-profolio-npbf.onrender.com';

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;',
}[character]));

const renderMessages = async () => {
  const response = await fetch(`${apiBaseUrl}/api/messages`);
  const messages = await response.json();
  messageCount.textContent = messages.length;
  messageList.innerHTML = messages.length ? messages.map((message) => `
    <article class="message-card">
      <div>
        <div class="message-meta"><strong class="message-name">${escapeHtml(message.name)}</strong><a class="message-email" href="mailto:${escapeHtml(message.email)}">${escapeHtml(message.email)}</a><time class="message-date">${new Date(message.createdAt).toLocaleString()}</time></div>
        <p class="message-text">${escapeHtml(message.message)}</p>
      </div>
      <button class="delete-message" type="button" data-message-id="${message.id}">Delete</button>
    </article>
  `).join('') : '<div class="empty-state">No messages yet. New contact form submissions will appear here.</div>';
};

messageList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-message-id]');
  if (!button) return;
  await fetch(`${apiBaseUrl}/api/messages/${encodeURIComponent(button.dataset.messageId)}`, { method: 'DELETE' });
  renderMessages();
});

clearMessages.addEventListener('click', async () => {
  if (window.confirm('Delete all contact messages?')) {
    await fetch(`${apiBaseUrl}/api/messages`, { method: 'DELETE' });
    renderMessages();
  }
});

renderMessages();
