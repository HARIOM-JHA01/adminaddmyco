import path from 'path';
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
export const view = path.join(__dirname,'Views');
export const assetsUrl = path.join(__dirname,'assets');
export const baseUrl = process.env['BASE_URL']
