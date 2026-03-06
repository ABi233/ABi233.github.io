// ── Prism.js code-enhance ──────────────────────────────────────────
// Kramdown outputs  <pre><code class="language-xxx">  but Prism.js
// (and its plugins: line-numbers, toolbar, copy-button …) also need
// the language class on the <pre> wrapper.  This script:
//   1. Copies the language-* class from <code> to <pre>
//   2. Adds the line-numbers class
//   3. Re-triggers Prism highlighting so the autoloader fetches the
//      correct grammar and all plugins initialise properly.

// Tell the autoloader where to find grammar files
if (window.Prism && Prism.plugins && Prism.plugins.autoloader) {
  Prism.plugins.autoloader.languages_path =
    'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/';
}

document.addEventListener('DOMContentLoaded', function () {
  // For every fenced code block produced by kramdown, propagate the
  // language class up to the <pre> so Prism and its plugins can work.
  document.querySelectorAll('.post-body pre > code[class*="language-"]').forEach(function (code) {
    var pre = code.parentElement;
    // Copy every language-* class to the <pre>
    code.classList.forEach(function (cls) {
      if (/^language-/.test(cls)) {
        pre.classList.add(cls);
      }
    });
    // Enable the line-numbers plugin
    pre.classList.add('line-numbers');
  });

  // Also handle bare <pre><code> blocks (no language specified) –
  // give them a generic "none" language so they still get styled.
  document.querySelectorAll('.post-body pre > code:not([class*="language-"])').forEach(function (code) {
    var pre = code.parentElement;
    code.classList.add('language-none');
    pre.classList.add('language-none', 'line-numbers');
  });

  // Now run Prism on the whole page
  if (window.Prism) {
    Prism.highlightAll();
  }
});

// After each block is highlighted, stamp data-lang on the .code-toolbar
// wrapper so CSS accent colours can target it.
if (window.Prism) {
  Prism.hooks.add('complete', function (env) {
    var pre = env.element && env.element.parentElement;
    if (!pre) return;
    var wrapper = pre.closest('div.code-toolbar');
    if (!wrapper) return;
    var match = pre.className.match(/language-(\S+)/);
    if (match) {
      wrapper.setAttribute('data-lang', match[1].toLowerCase());
    }
  });
}
