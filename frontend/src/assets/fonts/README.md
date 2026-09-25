# Bundled interface fonts

These unmodified variable TrueType files replace the external Google Fonts
stylesheet. No runtime download, system-font prerequisite, conversion, or
font dependency installation is required. Vite emits same-origin, hashed assets;
the browser requests only faces used by the page. Full upstream character sets
are retained, with system fallbacks for characters outside those sets.

| Local file | Upstream file | SHA-256 |
|---|---|---|
| `DMSans.ttf` | `DMSans[opsz,wght].ttf` | `8cd08d97e89c24d0aa92edd2f0f4c8ee6195eee9b7c9f154865a58b02f0c1c0d` |
| `DMSans-Italic.ttf` | `DMSans-Italic[opsz,wght].ttf` | `22259c0cc8237221b80f44c76ba8d36e6bce3cda72779f5b2773643d499720ae` |
| `JetBrainsMono.ttf` | `JetBrainsMono[wght].ttf` | `3cfafa86e28b87184d592fef82846e8c10cb48653c62efcda34f082da225ec34` |

DM Sans files come from
[googlefonts/dm-fonts, commit d0520ba](https://github.com/googlefonts/dm-fonts/tree/d0520ba03bd780f5dccb3024854463d44f699b78/Sans/fonts/variable).
JetBrains Mono comes from
[JetBrains/JetBrainsMono, commit 1937130](https://github.com/JetBrains/JetBrainsMono/tree/19371302b95d218af43299bce79ddbddd0bc364d/fonts/variable).
The local filenames are shortened; the font bytes and internal names are unchanged.
Both families use SIL Open Font License 1.1. Their copyright/license notices are
distributed at `/licenses/dm-sans-OFL.txt` and `/licenses/jetbrains-mono-OFL.txt`
from [the public licenses directory](../../../public/licenses).

The three files total 825,348 bytes (402,844 bytes when individually gzip-compressed).
This deliberately preserves the original variable fonts and coverage. It changes
asset ownership, not the JavaScript route-loading boundary.

## Deferred mathematical fonts

MathLive 0.110.0 remains an existing locked dependency. Its `fonts.css` and
`static.css` are imported only by the deferred math loader. Vite emits the
package's KaTeX WOFF2 assets or inlines its small font as a data URL; there is no
font CDN fallback. The loader disables MathLive's separate implicit font and
sound path discovery. No third-party dependency code is modified.

The distribution also carries `/licenses/mathlive-LICENSE.txt`, copied from the
installed package and cross-checked against
[MathLive 0.110.0](https://github.com/arnog/mathlive/blob/v0.110.0/LICENSE.txt),
and `/licenses/katex-fonts-LICENSE.txt`, from the
[KaTeX font project's license](https://github.com/KaTeX/katex-fonts/blob/master/LICENSE).
Both mathematical-library/font notices are MIT notices. The KaTeX license was
retrieved on 2026-09-25; no mathematical font file was replaced or downloaded.
