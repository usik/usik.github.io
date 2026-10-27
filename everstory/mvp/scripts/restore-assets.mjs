import {readdir,readFile,writeFile} from 'node:fs/promises';
const dir=new URL('../public/characters/',import.meta.url);
for(const name of await readdir(dir)){if(name.endsWith('.webp.base64'))await writeFile(new URL(name.slice(0,-7),dir),Buffer.from((await readFile(new URL(name,dir),'utf8')).trim(),'base64'));}
