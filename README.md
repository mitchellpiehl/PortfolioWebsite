# mitchellpiehl.com

Personal site of Mitchell Piehl, PhD candidate in Computer Science at the University of Iowa.

It's a plain static site (HTML, CSS, and a little JavaScript) hosted on GitHub Pages. There's no build step: whatever is in this repository is what gets served.

## Pages

| File | What it is |
|---|---|
| `index.html` | Home: bio, research summary, publications, experience, education |
| `research.html` | Interactive overview of MemFit, ER-MIA, and LATERN |
| `publications.html` | Full citations with abstracts and BibTeX |
| `resume.html` | Shows `files/Mitchell_Piehl_Resume.pdf` |
| `contact.html` | Links and the contact form (sent through Web3Forms) |
| `404.html` | Shown by GitHub Pages for any address that doesn't exist |

Styles are in `assets/css/site.css`. `assets/js/site.js` handles copy buttons, the publication toggles, and the contact form. `assets/js/research.js` runs the research page tabs, examples, and charts.

## Common updates

**New resume.** Replace `files/Mitchell_Piehl_Resume.pdf` with the new PDF and keep the same file name.

**A paper goes on arXiv or gets code.** Each paper has commented-out lines in `publications.html` (and in `research.html` for MemFit) that show exactly what to add, for example:

```html
<a class="chip" href="https://arxiv.org/abs/XXXX.XXXXX">arXiv</a>
```

Uncomment the line and fill in the link. The home page publication list in `index.html` has its own links in the `pub-links` line for each paper.

**A paper is accepted.** In `publications.html`, change the paper's `<span class="badge">Under review</span>` to the venue (use `class="badge badge-published"`), add a `pub-where` line with the full venue name, and update the BibTeX. Then change "Under review, 2026" on the home page and the "Under review" line in `research.html`.

**Chart numbers.** Every chart on the research page is drawn from the table inside it. Edit the table and the chart follows.

## Previewing locally

From this folder:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.
