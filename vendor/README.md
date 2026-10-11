# Third-party files

The PDF tools (`pdf-tools.html`) use these files. They are copied from npm packages without changes, except that `pdf.min.js` is the `pdf.min.mjs` file from PDF.js, saved with a `.js` name.

| File | Project | Version | License |
| --- | --- | --- | --- |
| `pdf-lib.min.js` | [pdf-lib](https://github.com/Hopding/pdf-lib) | 1.17.1 | MIT, see `LICENSE-pdf-lib.md` |
| `pdf.min.js`, `pdf.worker.min.js`, `standard_fonts/` | [PDF.js](https://github.com/mozilla/pdf.js) (`pdfjs-dist`) | 6.2.108 | Apache-2.0, see `LICENSE-pdfjs.txt` |

`standard_fonts/` holds the fonts PDF.js uses for standard PDF fonts, such as Helvetica, when a PDF does not include them. Their licenses are in `standard_fonts/LICENSE_FOXIT` and `standard_fonts/LICENSE_LIBERATION`.

To update a library, copy the files from the new package version and update this table.
