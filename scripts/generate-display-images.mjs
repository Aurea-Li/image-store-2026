import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const displayDir = path.join(root, "display");
const maxWidth = Number(process.env.DISPLAY_MAX_WIDTH || 1600);
const quality = Number(process.env.DISPLAY_JPEG_QUALITY || 84);
const imageExtensions = new Set([".jpg", ".jpeg"]);
const ignoredDirs = new Set([
  ".git",
  ".github",
  "display",
  "node_modules",
  "scripts",
]);

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        yield* walk(fullPath);
      }
      continue;
    }
    if (entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase())) {
      yield fullPath;
    }
  }
}

function manifestKey(filePath) {
  const relative = path.relative(root, filePath);
  if (relative.startsWith(`originals${path.sep}`)) {
    return toPosix(path.relative(path.join(root, "originals"), filePath));
  }
  return toPosix(relative);
}

async function processImage(sourcePath, manifest) {
  const key = manifestKey(sourcePath);
  const outputPath = path.join(displayDir, key);
  const sourceStats = await fs.stat(sourcePath);
  const sourceImage = sharp(sourcePath, { failOn: "none" });
  const sourceMeta = await sourceImage.metadata();

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const transformer = sharp(sourcePath, { failOn: "none" })
    .rotate()
    .resize({
      width: maxWidth,
      withoutEnlargement: true,
    })
    .jpeg({
      quality,
      progressive: true,
      mozjpeg: true,
    });

  await transformer.toFile(outputPath);

  const displayStats = await fs.stat(outputPath);
  const displayMeta = await sharp(outputPath).metadata();

  manifest[key] = {
    original: {
      width: sourceMeta.width || null,
      height: sourceMeta.height || null,
      bytes: sourceStats.size,
    },
    display: {
      width: displayMeta.width || null,
      height: displayMeta.height || null,
      bytes: displayStats.size,
      maxWidth,
      quality,
    },
  };
}

const manifest = {};

for await (const sourcePath of walk(root)) {
  await processImage(sourcePath, manifest);
}

await fs.mkdir(displayDir, { recursive: true });
await fs.writeFile(
  path.join(displayDir, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(`Generated ${Object.keys(manifest).length} display images.`);
