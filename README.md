# Abdulaziz's Portfolio

Improve your tech with me.

My personal website with data analysis, dashboard and IoT projects.

## View the website

https://codebyabdulaziz.github.io/

## Run locally

Open `index.html` in a browser. No install or build step is needed.

The PDF tools use JavaScript modules and a worker. Browsers block these when a page is opened straight from disk, so serve the folder instead, for example with `python3 -m http.server`, then open http://localhost:8000/pdf-tools.html.

## Files

- `index.html`: page content
- `styles.css`: colors and layout
- `script.js`: menu and navigation
- `analytics.js`: optional Google Analytics and visitor choices
- `privacy.html`: privacy information
- `404.html`: page shown for links that do not exist
- `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`: browser and phone icons
- `og-image.jpg`: preview image when the link is shared (WhatsApp, LinkedIn, X)
- Image files: logo and project screenshots. Browsers load the small `.webp` files. The `.png` and `.jpg` files are kept for old browsers.
- `pdf-tools.html`, `pdf-tools.css`, `pdf-tools.js`: the PDF tools page (merge, compress, extract pages, rotate, images to PDF, page numbers). Files are processed in the visitor's browser and are not uploaded.
- `pdf-tools-compat.js`, `pdf-tools-worker.js`: a small compatibility fix and the worker entry for PDF.js, used by the PDF tools
- `vendor/`: third-party libraries used by the PDF tools (pdf-lib and PDF.js) and their licenses. See `vendor/README.md`.

## Hosting

GitHub Pages serves the files from the root of the `main` branch.

## Website analytics

Google Analytics runs only on the live HTTPS website after a visitor accepts it. Local previews do not send visits. Visitors can change their choice in the footer.

## Security

- Each page has a Content Security Policy in its `<meta http-equiv="Content-Security-Policy">` tag. It only allows files from this website and Google Analytics. If you add something from another website (a font, a video, a form, another analytics tool), add that domain to the policy in every page, or the browser will block it. Blocked items show as "Refused to load" in the browser console.
- Keep `rel="noopener noreferrer"` on links that open in a new tab.
- Everything in this repository is public. Do not add passwords, API keys or private files.
- GitHub Pages does not allow custom server headers. The site is served over HTTPS by GitHub.

## Adding a project image

Save the screenshot, then make a `.webp` copy about 960 pixels wide (for example with https://squoosh.app). Use a `<picture>` tag like the existing projects so browsers load the smaller file.
