import _ from 'underscore';

import { BuilderContext } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';

export interface HelmInstallOptions extends JsonObject {
  repository: string;
  chart: string;
  valuesPath: string;
  upgrade: boolean;
}

export const createInstallCommand = (options: HelmInstallOptions, context: BuilderContext): string => {
  if (context.target === undefined) {
    throw new Error('No target found!');
  }

  if (context.target.project === undefined) {
    throw new Error('Unable to get project name!');
  }

  if (options.chart === undefined || options.chart === '') {
    throw new Error('You must specify a helm chart.');
  }

  const verb = options.upgrade ? 'upgrade' : 'install';
  const name = context.target.project;
  const repository = options.repository !== undefined ? `${options.repository}/` : '';
  const values = options.valuesPath !== undefined ? ` -f ${options.valuesPath}` : '';

  const command = `helm ${verb} ${name} ${repository}${options.chart}${values}`;

  return command;
};
