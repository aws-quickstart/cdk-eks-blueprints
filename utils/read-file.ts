import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as eks from '@aws-cdk/aws-eks';


export function readYamlFromDir(dir: string, cluster: eks.Cluster) {
    fs.readdir(dir, 'utf8', (err, files) => {
      if (files!=undefined) {
        files.forEach((file) => {
        if (file.split('.').pop()=='yaml') {
          fs.readFile(dir+file, 'utf8', (err, data) => {
            if (data!=undefined) {
              let i = 0;
              yaml.loadAll(data).forEach((item) => {
                cluster.addManifest(file.substr(0,file.length-5)+i, item);
                i++;
              })
            }
          })
        }
      })} else {
        console.log(`${dir} is empty`);
      }
        
      })
}