import { App } from 'aws-cdk-lib';
import { build } from '../lib/pipeline';

const app = new App();

console.log("Running nest pipeline build command");
build(app);