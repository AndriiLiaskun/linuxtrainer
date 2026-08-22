// One-off icon build: renders icon.svg to icon.png (1024) and icon.ico
// (multi-resolution) for the Windows installer/app icon.
'use strict';
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { imagesToIco } = require('png-to-ico');

const SVG = path.join(__dirname, 'icon.svg');
const PNG_1024 = path.join(__dirname, 'icon.png');
const ICO = path.join(__dirname, 'icon.ico');
const SIZES = [16, 24, 32, 48, 64, 128, 256];

async function main() {
  await sharp(SVG).resize(1024, 1024).png().toFile(PNG_1024);

  const images = [];
  for (const size of SIZES) {
    const { data, info } = await sharp(SVG)
      .resize(size, size)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    images.push({ width: info.width, height: info.height, data });
  }
  const icoBuf = await imagesToIco(images);
  fs.writeFileSync(ICO, icoBuf);
  console.log('Wrote', PNG_1024, 'and', ICO);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
