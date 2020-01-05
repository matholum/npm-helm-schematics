import { execSync } from 'child_process';
import {
    createBuildCommand, DockerBuildOptions
} from 'docker-schematics/builders/base/dockerBuild';
import { spawn$ } from 'observable-spawn';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import _ from 'underscore';

import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';

interface HelmScriptBuilderOptions extends JsonObject {
  buildPath: string;
  dockerfile: string;
  dockerignore: string;
}

export default createBuilder<HelmScriptBuilderOptions>(
  (options: HelmScriptBuilderOptions, context: BuilderContext): Promise<BuilderOutput> => {
    if (context.target === undefined) {
      throw new Error('Unable to get project name!');
    }

    const dockerEnvVars = execSync('minikube docker-env')
      .toString('utf-8')
      .replace(/(export|set|set \-gx|\$Env\:|SET|\(setenv \")/g, '')
      .replace(/[ \"\;]/g, '')
      .split('\n')
      .filter(line => !line.startsWith('#') && line !== '');

    const dockerEnvPairs = _.map(dockerEnvVars, v => v.split('='));

    const dockerOptions = {
      buildPath: options.buildPath,
      dockerfile: options.dockerfile,
      dockerignore: options.dockerignore
    } as DockerBuildOptions;

    _.each(dockerEnvPairs, pair => {
      process.env[pair[0]] = pair[1];
    });

    const args = {
      env: {
        ...process.env,
        ..._.object(dockerEnvPairs)
      }
    };

    const command = createBuildCommand(dockerOptions, context);

    console.log(`Doing a docker build on project '${context.target.project}' within minikube...`);

    return new Observable<BuilderOutput>(obs => {
      spawn$(command, args)
        .pipe(tap(output => console.log(output)))
        .subscribe(
          undefined,
          (err: any) => {
            console.error(err);
            obs.error(err);
            obs.complete();
          },
          () => {
            obs.next({ success: true });
            obs.complete();
          }
        );
    }).toPromise();
  }
);
