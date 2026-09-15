const graphic = document.querySelector('.signal-graphic');
const contactForm = document.querySelector('#contact-form');
const formStatus = document.querySelector('#form-status');
const apiBaseUrl = 'https://my-profolio-npbf.onrender.com';

const loader = document.querySelector('#site-loader');
const loaderTime = document.querySelector('#loader-time');
const loaderEnter = document.querySelector('.loader-enter');
const loaderLines = document.querySelectorAll('.code-lines span');
const loaderSnippets = [
  ['const', ' developer = ', '"AA Oluniyi";'],
  ['fetch', '(', '"/api/projects"', ');'],
  ['SELECT', ' * FROM ', 'projects', ' WHERE stack = "full-stack";'],
  ['git', ' commit -m ', '"ship useful software";'],
];
let loaderInterval;
let snippetInterval;

const finishLoading = () => {
  if (!loader || loader.classList.contains('is-loaded')) return;
  loader.classList.add('is-loaded');
  document.body.classList.remove('is-loading');
  window.clearInterval(loaderInterval);
  window.clearInterval(snippetInterval);
};

window.addEventListener('load', () => {
  let remaining = 120;
  loaderInterval = window.setInterval(() => {
    remaining -= 1;
    if (loaderTime) loaderTime.textContent = `00:${String(remaining).padStart(2, '0')}`;
    if (remaining <= 0) finishLoading();
  }, 1000);

  let snippetIndex = 0;
  snippetInterval = window.setInterval(() => {
    snippetIndex = (snippetIndex + 1) % loaderSnippets.length;
    loaderLines.forEach((line, index) => {
      const snippet = loaderSnippets[(snippetIndex + index) % loaderSnippets.length];
      line.innerHTML = `<i>${snippet[0]}</i>${snippet.slice(1).join('')}`;
    });
  }, 3200);
});

loaderEnter?.addEventListener('click', finishLoading);

contactForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(contactForm);
  if (formStatus) {
    formStatus.className = 'form-status is-sending';
    formStatus.textContent = 'Sending message...';
  }
  fetch(`${apiBaseUrl}/api/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.fromEntries(formData.entries())),
  })
    .then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to send message.');
      contactForm.reset();
      if (formStatus) {
        formStatus.className = 'form-status is-success';
        formStatus.textContent = 'Thanks. Your message is on its way to my inbox.';
      }
    })
    .catch((error) => {
      if (formStatus) {
        formStatus.className = 'form-status is-error';
        formStatus.textContent = 'Your message was saved, but email delivery needs attention.';
      }
    });
});

if (graphic && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  graphic.addEventListener('pointermove', (event) => {
    const bounds = graphic.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 10;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 10;
    graphic.style.setProperty('--pointer-x', `${x}px`);
    graphic.style.setProperty('--pointer-y', `${y}px`);
  });

  graphic.addEventListener('pointerleave', () => {
    graphic.style.setProperty('--pointer-x', '0px');
    graphic.style.setProperty('--pointer-y', '0px');
  });
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', () => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) target.setAttribute('tabindex', '-1');
  });
});
const navigationLinks = document.querySelectorAll('.main-nav a');
const sections = document.querySelectorAll('main section[id]');
const revealItems = document.querySelectorAll('.project, .approach-section > *, .contact-section');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealItems.forEach((item) => {
  item.classList.add('reveal-item');
  revealObserver.observe(item);
});

const navigationObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;

    navigationLinks.forEach((link) => {
      link.classList.toggle('is-current', link.getAttribute('href') === `#${entry.target.id}`);
    });
  });
}, { rootMargin: '-35% 0px -55% 0px' });

sections.forEach((section) => navigationObserver.observe(section));
