import * as fs from 'fs-extra';
import path from 'path';
import _ from 'underscore';

import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { getSystemPath, JsonObject, normalize, resolve } from '@angular-devkit/core';

import { createInstallCommand, HelmInstallOptions } from '../base/helmInstall';

interface HelmScriptBuilderOptions extends JsonObject {
  repository: string;
  chart: string;
  buildPath: string;
  projectHelmPath: string;
  valuesPath: string;
  scriptExtension: string;
  upgrade: boolean;
}

export default createBuilder<HelmScriptBuilderOptions>(
  (options: HelmScriptBuilderOptions, context: BuilderContext): Promise<BuilderOutput> => {
    return new Promise<BuilderOutput>((res, rej) => {
      if (context.target === undefined) {
        throw new Error('No target found!');
      }

      if (options.buildPath === undefined || options.buildPath === '') {
        throw new Error('You must specify a build path.');
      }

      const root = context.workspaceRoot;
      const buildPath: string = getSystemPath(resolve(normalize(root), normalize(options.buildPath)));

      if (!fs.existsSync(buildPath)) {
        throw new Error('The build path specified cannot be found.');
      }

      const baseOptions = {
        repository: options.repository,
        chart: options.chart,
        upgrade: options.upgrade
      } as HelmInstallOptions;

      if(options.projectHelmPath !== undefined) {
        console.log(`Copying your project's helm directory '${options.projectHelmPath}' to build path '${options.buildPath}'...`);

        const projectHelmPath = getSystemPath(resolve(normalize(root), normalize(options.projectHelmPath)));
        const destHelmPath = path.join(buildPath, 'helm');

        fs.mkdirpSync(destHelmPath);
        fs.copySync(projectHelmPath, destHelmPath);

        baseOptions.valuesPath = options.valuesPath !== undefined
          ? `.${path.sep}${path.join('helm', options.valuesPath)}`
          : `.${path.sep}${path.join('helm', 'values.yaml')}`;
      }

      console.log(`Creating helm deploy script for project '${context.target.project}'...`);

      const command = createInstallCommand(baseOptions, context);

      const ext = options.scriptExtension || 'sh';
      const scriptPath: string = path.join(buildPath, `deploy.${ext}`);

      fs.writeFile(scriptPath, command)
        .then(() => res({ success: true }))
        .catch(rej);
    });
  }
);
