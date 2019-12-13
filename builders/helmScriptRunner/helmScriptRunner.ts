import { spawn$ } from 'observable-spawn';
import path from 'path';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import _ from 'underscore';

import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { getSystemPath, JsonObject, normalize, resolve } from '@angular-devkit/core';

import { createInstallCommand, HelmInstallOptions } from '../base/helmInstall';

interface HelmScriptRunnerOptions extends JsonObject {
    repository: string;
    chart: string;
    projectHelmPath: string;
    valuesPath: string;
    upgrade: boolean;
  }

export default createBuilder<HelmScriptRunnerOptions>(
    (options: HelmScriptRunnerOptions, context: BuilderContext): Promise<BuilderOutput> => {
        if (context.target === undefined) {
          throw new Error('No target found!');
        }

        const root = context.workspaceRoot;

        const baseOptions = {
          repository: options.repository,
          chart: options.chart,
          upgrade: options.upgrade
        } as HelmInstallOptions;

        if(options.projectHelmPath !== undefined) {
          const projectHelmPath = getSystemPath(resolve(normalize(root), normalize(options.projectHelmPath)));

          baseOptions.valuesPath = options.valuesPath !== undefined
            ? path.join(projectHelmPath, options.valuesPath)
            : path.join(projectHelmPath, 'values.yaml');
        }

        const command = createInstallCommand(baseOptions, context);

        console.log(`Installing the helm chart '${options.chart}'...`);

        return new Observable<BuilderOutput>(obs => {
            spawn$(command)
            .pipe(
                tap(output => console.log(output))
            )
            .subscribe(
                    undefined,
                    (err: any) => {
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
