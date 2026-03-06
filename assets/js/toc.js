document.addEventListener('DOMContentLoaded', function () {
  const container = document.querySelector('.post-body') || document.body;
  const tocEl = document.getElementById('toc');
  if (!tocEl || !container) return;

  // Collect headings h1-h4 inside the post body
  const headings = container.querySelectorAll('h1, h2, h3, h4');
  if (!headings.length) {
    tocEl.style.display = 'none';
    return;
  }

  // helper to slugify heading text
  function slugify(text) {
    return text.toString().toLowerCase().trim()
      .replace(/\s+/g, '-')
      .replace(/[\u4e00-\u9fff]/g, function (m) { return encodeURIComponent(m); })
      .replace(/[^a-z0-9\-\%]/g, '')
      .replace(/\-+/g, '-');
  }

  const list = document.createElement('ul');
  list.className = 'toc-list';

  headings.forEach((h) => {
    const level = parseInt(h.tagName.slice(1), 10);
    if (!h.id) h.id = slugify(h.textContent || h.innerText || 'heading');

    const li = document.createElement('li');
    li.setAttribute('data-level', String(level));
    const a = document.createElement('a');
    a.href = '#' + h.id;
    a.textContent = h.textContent || h.innerText;
    a.addEventListener('click', function () { history.replaceState(null, '', '#' + h.id); });

    li.appendChild(a);
    list.appendChild(li);
  });

  const title = document.createElement('h3');
  title.textContent = '目录';
  tocEl.appendChild(title);
  tocEl.appendChild(list);

  // Simple scrollspy to highlight current heading
  const anchors = Array.from(list.querySelectorAll('a'));
  function onScroll() {
    const offset = 10;
    let current = null;
    headings.forEach((h) => {
      const rect = h.getBoundingClientRect();
      if (rect.top <= offset + 10) current = h;
    });
    anchors.forEach(a => a.classList.remove('active'));
    if (current) {
      const active = list.querySelector('a[href="#' + current.id + '"]');
      if (active) active.classList.add('active');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
});
