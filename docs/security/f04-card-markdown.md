# F04: sanitize the final card Markdown HTML

A card detail such as `[audit link](javascript:alert%281%29)` previously passed
through DOMPurify as Markdown, then Marked generated an executable `href`.
The detail page inserted that generated HTML without a second sanitization.
The regression test reproduces this unsafe ordering with a synthetic string.
No payload was saved to the site or executed against a real account.

CardDetail now calls `renderSafeMarkdown`: parse Markdown synchronously with
line breaks, sanitize the resulting HTML using DOMPurify's HTML profile, then
insert only that sanitized result. A parsing/sanitization error returns an
empty string, never raw input or unfiltered HTML. The page's remaining text
sanitization error branch also returns empty content instead of the input.

Normal headings, emphasis, lists, code, line breaks, HTTPS/relative/mailto links
and HTTPS images are preserved. Dangerous schemes lose their link destination;
raw scripts, event handlers and SVG are removed. HTML-profile sanitization
intentionally excludes SVG/MathML; it does not fetch or verify external URLs.
The rendered card node is still the source used by the existing download/share
flow. No stored card content or API response is rewritten.

DOMPurify is upgraded from 3.3.0 to 3.4.17 in package.json and both lock files.
This also updates its use by other existing rendering surfaces; their code
already generally sanitizes after conversion and is left unchanged. The upgrade
alone does not fix this ordering bug: the new test reproduces the unsafe order
even on the upgraded dependency.

## Validation

17 new DOM-based Vitest cases cover the original proof, mixed-case/entity/
control-character/reference links, javascript/vbscript/data schemes, mixed raw
HTML and Markdown, safe formatting/links/images, empty inputs and forced parser
or sanitizer failures. These and 18 existing selected regression cases pass
(35 total). Tests run using DOMPurify 3.4.17, Marked 16.4.1 and jsdom 26.1.0.

Netlify's PR preview provides the full application build check. No production
card writes, database changes or real malicious link clicks are needed.

## Rollout

This patch is based directly on main and can be merged independently of the
F01–F03 PRs. Merge/deploy this PR to protect card-detail rendering. No migration,
environment change, or content cleanup is required. Confirm a normal card
still displays correctly, then verify its download/share flow in the deployed
browser. Those interactive browser smoke tests remain manual rollout checks.

Production stays unchanged until this PR is merged/deployed. Do not roll back
only the sanitizer order if a display issue appears; keep final-output
sanitization and adjust the narrowly needed safe formatting instead.

References:

- https://marked.js.org/using_advanced (sanitize output HTML)
- https://github.com/cure53/DOMPurify (post-sanitization modifications)
- https://github.com/cure53/DOMPurify/releases/tag/3.4.17
