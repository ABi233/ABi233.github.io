// Render ==highlighted text== as <mark> elements.
// kramdown does not support this syntax natively, so we do it in JS
// after the DOM is ready, scoped to the post body only.
document.addEventListener('DOMContentLoaded', function () {
  var postBody = document.querySelector('.post-body, article.blog-post');
  if (!postBody) return;

  // Collect all block-level containers that may contain == markers.
  var containers = postBody.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, td, th');

  containers.forEach(function (el) {
    if (el.innerHTML.indexOf('==') === -1) return;
    el.innerHTML = replaceHighlight(el.innerHTML);
  });

  // Replace ==...== in an HTML string.
  // Step 1: replace ALL ==...== (may span inline tags) with <mark>...</mark>
  // Step 2: undo any replacements that ended up inside <code> or <pre> blocks
  function replaceHighlight(html) {
    // Step 1: global replace ([\s\S]+? handles inline tags between == markers)
    var result = html.replace(/==([\s\S]+?)==/g, '<mark>$1</mark>');

    // Step 2: undo <mark> inside <code> or <pre> by restoring original text
    result = result.replace(
      /(<(?:pre|code)[^>]*>)([\s\S]*?)(<\/(?:pre|code)>)/gi,
      function (match, open, content, close) {
        // Revert <mark> back to ==...== inside code blocks
        var restored = content.replace(/<mark>([\s\S]*?)<\/mark>/g, '==$1==');
        return open + restored + close;
      }
    );

    return result;
  }
});

