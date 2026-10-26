import 'dotenv/config';
import { openSync, closeSync } from 'node:fs';
import { resolve } from 'node:path';
const url=process.env.DATABASE_URL;
if(url?.startsWith('file:'))closeSync(openSync(resolve('prisma',url.slice(5)),'a'));
