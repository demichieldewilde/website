# Michiel De Wilde — personal academic website

A dependency-free static website, ready for GitHub Pages.

## Publish on GitHub Pages

1. Push this repository to GitHub.
2. Open **Settings → Pages** in the repository.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select your main branch and `/ (root)`, then save.

## Add a publication

Open `assets/publications.js` and add an object to `window.PUBLICATIONS`:

```js
window.PUBLICATIONS = [
  {
    type: "preprint",
    year: "2026",
    title: "Your paper title",
    authors: "M. De Wilde, A. Collaborator",
    venue: "arXiv",
    url: "https://arxiv.org/..."
  }
];
```

The publication page updates its counters, search, and filters automatically.

## For future Michiel

Add a publication by copying one item in assets/publications.js. Filters and search update automatically.

## Future Field Notes additions

Field Notes is active and currently contains visual recaps of the research papers. Possible future additions: a separate open-questions page and a reading list.
