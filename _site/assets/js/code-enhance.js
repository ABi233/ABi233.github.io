// Configure Prism autoloader to fetch language grammars from jsDelivr CDN
if (window.Prism && Prism.plugins && Prism.plugins.autoloader) {
  Prism.plugins.autoloader.languages_path =
    'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/';
}

// Add line-numbers class BEFORE Prism runs so the plugin picks it up
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.post-body pre[class*="language-"]').forEach(function (pre) {
    pre.classList.add('line-numbers');
  });
});

// After each block is highlighted, stamp data-lang on the .code-toolbar wrapper
// so CSS accent colours can target it. This hook fires per-element, after the
// toolbar plugin has already wrapped the <pre> in a div.code-toolbar.
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
