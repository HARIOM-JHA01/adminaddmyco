import fs from 'fs';
import yaml from 'js-yaml';
import swaggerUi from 'swagger-ui-express';

const swaggerDocument = yaml.load(fs.readFileSync('./swagger.yaml', 'utf8'));

export { swaggerUi, swaggerDocument };
