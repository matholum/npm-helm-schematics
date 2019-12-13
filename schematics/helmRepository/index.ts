import { execSync } from 'child_process';
import path from 'path';
import _ from 'underscore';

import { chain, noop, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { getProjectConfig } from '@nrwl/workspace';

import { addHelmToWorkspaceJson, check as checkBase, HelmOptions } from '../base/helm';
import { Schema } from './schema';

function check(options: Schema): Rule {
  const helmOptions = {
    ...options,
    isLocalChart: false
  } as HelmOptions;

  const rule = (options: HelmOptions): Rule => {
    return (host: Tree) => {
      if (options.repository === undefined) {
        throw new Error(`No helm repository specified!`);
      }

      if (options.chart === undefined) {
        throw new Error(`No helm chart specified!`);
      }

      return host;
    };
  };

  return chain([rule(helmOptions), checkBase(helmOptions)]);
}

function createValuesFile(options: Schema): Rule {
  return (host: Tree) => {
    if (options.createValues === undefined || !options.createValues) {
      return noop();
    }

    console.log(`Fetching values for ${options.repository}/${options.chart}...`);

    const projectConfig = getProjectConfig(host, options.project);

    const command = `helm show values ${options.repository}/${options.chart}`;

    const values = execSync(command).toString('utf-8');
    const valuesPath = path.join(projectConfig.root, 'helm', 'values.yaml');

    host.create(valuesPath, values);

    return host;
  };
}

export function updateWorkspaceJson(options: Schema): Rule {
  const helmOptions = {
    ...options,
    isLocalChart: false
  } as HelmOptions;

  return addHelmToWorkspaceJson(helmOptions);
}

export default function helm(schema: Schema): Rule {
  return (host: Tree, context: SchematicContext) => {
    return chain([
      //init(),
      check(schema),
      createValuesFile(schema),
      updateWorkspaceJson(schema)
    ])(host, context);
  };
}
