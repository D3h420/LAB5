# Micro Portfolio (Static GitHub Pages Site)

Single-page micro-portfolio using plain HTML, CSS, and JS with no build step.

## Files

- `index.html`
- `styles.css`
- `script.js`
- `assets/projects/project1.png`
- `assets/projects/project2.png`
- `assets/projects/project3.png`
- `assets/favicon.svg`

## Run Locally

Open `index.html` directly in a browser.

## Deploy to GitHub Pages

1. Push this repository to GitHub on the `main` branch.
2. Open repository **Settings**.
3. Go to **Pages**.
4. Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/(root)**
5. Save and wait for the deploy URL.

## Edit Content Quickly

### Name, tagline, and email

Edit the placeholder block near the top of `index.html`:

- `NAME`
- `TAGLINE`
- `CONTACT_EMAIL`

Also update visible text and links in:

- Hero section (`<h1>`, tagline, contact button)
- Social/email list

### Projects (3 cards)

In `index.html`, replace each project card’s:

- title
- description
- GitHub link
- demo link

### Replace project images

Overwrite these local files with your own thumbnails (keep names or update `index.html` paths):

- `assets/projects/project1.png`
- `assets/projects/project2.png`
- `assets/projects/project3.png`

Recommended thumbnail ratio: `16:9` (for example `960x540`).

## Animation Control

In `script.js`, toggle this line:

```js
const ENABLE_BACKGROUND_ANIMATION = true;
```

Set it to `false` to disable animated canvas effects globally.
Users with reduced-motion preferences are also respected automatically.

## Optional Custom Domain (Brief)

1. In GitHub **Settings → Pages**, set your custom domain.
2. Add a `CNAME` file in the repository root containing your domain.
3. Point your DNS records to GitHub Pages as instructed by GitHub.
