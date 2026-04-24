import pngToIco from 'png-to-ico';
import fs from 'fs';

const buf = await pngToIco('resources/icons/icon.png');
fs.writeFileSync('resources/icons/icon.ico', buf);
console.log('ico saved, size:', buf.length, 'bytes');
