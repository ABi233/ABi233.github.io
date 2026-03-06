// ── code-enhance.js ────────────────────────────────────────────────
//
// This script handles TWO different rendering paths:
//
//   A) **GitHub Pages (Rouge server-side highlighting)**
//      Rouge/kramdown produces:
//        <div class="language-cpp highlighter-rouge">
//          <div class="highlight">
//            <pre class="highlight"><code><span class="k">...</span></code></pre>
//          </div>
//        </div>
//      Tokens are already highlighted with Rouge classes (.k, .s, .cm …).
//      We must NOT run Prism on these — it would destroy the existing
//      markup. Instead we add a toolbar (language label + copy button)
//      and optional line numbers via plain DOM work.
//
//   B) **Local build (kramdown with syntax_highlighter: none)**
//      kramdown produces:
//        <pre><code class="language-cpp">…plain text…</code></pre>
//      No server-side highlighting — we rely on Prism.js to tokenise
//      the code at runtime, so we need to prepare the DOM and call
//      Prism.highlightAll().
//
// Detection: if the page contains `.highlighter-rouge` wrappers, we
// are in path A; otherwise path B.
// ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
  var postBody = document.querySelector('.post-body');
  if (!postBody) return;

  var isRouge = postBody.querySelector('div.highlighter-rouge') !== null;

  if (isRouge) {
    // ── Path A: Rouge (GitHub Pages) ──────────────────────────────
    enhanceRougeBlocks(postBody);
  } else {
    // ── Path B: plain <pre><code class="language-*"> (local build) ─
    enhancePrismBlocks(postBody);
  }
});

/* ================================================================
   Path A  –  Rouge blocks
   ================================================================ */
function enhanceRougeBlocks(root) {
  // IMPORTANT: use "div.highlighter-rouge" to skip inline <code> elements
  // that Rouge also marks with class="… highlighter-rouge".
  root.querySelectorAll('div.highlighter-rouge').forEach(function (wrapper) {
    // Determine language from the wrapper's class, e.g. "language-cpp"
    var lang = 'text';
    wrapper.classList.forEach(function (cls) {
      var m = cls.match(/^language-(\S+)/);
      if (m) lang = m[1];
    });

    // Stamp data-lang so CSS accent colours can target it
    wrapper.setAttribute('data-lang', lang.toLowerCase());

    // Build a toolbar: language label + copy button
    var toolbar = document.createElement('div');
    toolbar.className = 'code-toolbar-bar';

    var langSpan = document.createElement('span');
    langSpan.className = 'code-lang-label';
    langSpan.textContent = lang.toUpperCase();

    var copyBtn = document.createElement('button');
    copyBtn.className = 'code-copy-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', function () {
      var code = wrapper.querySelector('pre code');
      if (!code) return;
      navigator.clipboard.writeText(code.textContent).then(function () {
        copyBtn.textContent = 'Copied!';
        setTimeout(function () { copyBtn.textContent = 'Copy'; }, 2000);
      });
    });

    toolbar.appendChild(langSpan);
    toolbar.appendChild(copyBtn);
    wrapper.insertBefore(toolbar, wrapper.firstChild);

    // Add line numbers via CSS counters
    var codeEl = wrapper.querySelector('pre code');
    if (codeEl) {
      addLineNumbers(codeEl);
    }
  });
}

/* Add line-number spans using CSS counters driven by a wrapper class */
function addLineNumbers(codeEl) {
  var pre = codeEl.parentElement;
  pre.classList.add('line-numbers');

  // Split the code HTML by newlines and wrap each line in a <span class="code-line">
  var lines = codeEl.innerHTML.split('\n');
  // Remove trailing empty line that kramdown often adds
  if (lines.length && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }
  codeEl.innerHTML = lines.map(function (l) {
    return '<span class="code-line">' + l + '</span>';
  }).join('\n');
}

/* ================================================================
   Path B  –  Prism blocks  (local build)
   ================================================================ */
function enhancePrismBlocks(root) {
  // Configure autoloader path
  if (window.Prism && Prism.plugins && Prism.plugins.autoloader) {
    Prism.plugins.autoloader.languages_path =
      'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/';
  }

  // Propagate language-* from <code> to <pre> so Prism plugins work
  root.querySelectorAll('pre > code[class*="language-"]').forEach(function (code) {
    var pre = code.parentElement;
    code.classList.forEach(function (cls) {
      if (/^language-/.test(cls)) {
        pre.classList.add(cls);
      }
    });
    pre.classList.add('line-numbers');
  });

  // Handle bare <pre><code> without language
  root.querySelectorAll('pre > code:not([class*="language-"])').forEach(function (code) {
    var pre = code.parentElement;
    code.classList.add('language-none');
    pre.classList.add('language-none', 'line-numbers');
  });

  // Trigger Prism highlighting
  if (window.Prism) {
    Prism.highlightAll();
  }
}

/* ================================================================
   Prism 'complete' hook  –  stamp data-lang on .code-toolbar wrapper
   (only fires for Path B)
   ================================================================ */
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
