# image-store-2026

Image source repo for the Sheep Garden Hugo site.

## Workflow

Upload original images into dated folders at the repo root:

```text
2026-04-27-Korea-Film/IMG_2277.jpg
```

The GitHub Action generates optimized display JPEGs with the same relative path:

```text
display/2026-04-27-Korea-Film/IMG_2277.jpg
```

The blog loads `display/...` in the page and uses the original root image for the lightbox.

## Local Generation

```sh
npm install
npm run generate:display
```

Generated display images are capped at `1600px` wide, encoded as progressive JPEGs, and recorded in `display/manifest.json`. The generator currently processes `.jpg` and `.jpeg` files.
