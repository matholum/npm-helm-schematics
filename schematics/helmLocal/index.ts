import path from 'path';
import _ from 'underscore';

import { strings } from '@angular-devkit/core';
import {
    apply, applyTemplates, chain, filter, mergeWith, move, Rule, SchematicContext, Tree, url
} from '@angular-devkit/schematics';
import { getProjectConfig, offsetFromRoot } from '@nrwl/workspace';

import { addHelmToWorkspaceJson, HelmOptions } from '../base/helm';
import { Schema } from './schema';

function check(options: Schema): Rule {
  return (host: Tree) => {
    const projectConfig = getProjectConfig(host, options.project);

    if (projectConfig.architect.buildHelmScript) {
      throw new Error(`${options.project} already has a buildHelmScript architect option.`);
    }

    return host;
  };
}

export function createFiles(options: Schema): Rule {
  return chain([
    createHelmFiles(options),
    createValuesFile(options)
  ]);
}

export function createHelmFiles(options: Schema): Rule {
  return (host, context) => {
    const projectConfig = getProjectConfig(host, options.project);

    const projectHelmPath = path.join(projectConfig.root, 'helm');
    const chartPath = path.join(projectHelmPath, 'chart');

    return mergeWith(
      apply(url('./files'), [
        applyTemplates({
          ...options,
          projectRoot: projectConfig.root,
          className: strings.classify(options.project),
          kebobName: strings.dasherize(options.project),
          offsetFromRoot: offsetFromRoot(projectConfig.root)
        }),
        move(chartPath)
      ])
    )(host, context);
  };
}

export function createValuesFile(options: Schema): Rule {
  return (host, context) => {
    const projectConfig = getProjectConfig(host, options.project);

    const projectHelmPath = path.join(projectConfig.root, 'helm');

    return mergeWith(
      apply(url('./files'), [
        filter(f => path.basename(f) === 'values.yaml.template'),
        applyTemplates({
          ...options,
          projectRoot: projectConfig.root,
          className: strings.classify(options.project),
          kebobName: strings.dasherize(options.project),
          offsetFromRoot: offsetFromRoot(projectConfig.root)
        }),
        move(projectHelmPath)
      ])
    )(host, context);
  };
}

export function updateWorkspaceJson(options: Schema): Rule {
    const helmOptions = {
      ...options,
      chart: `.${path.sep}${path.join('helm', 'chart')}`,
      isLocalChart: true
    } as HelmOptions;

    return addHelmToWorkspaceJson(helmOptions);
}

export default function helm(schema: Schema): Rule {
  return (host: Tree, context: SchematicContext) => {
    return chain([
      //init(),
      check(schema),
      createFiles(schema),
      updateWorkspaceJson(schema)
    ])(host, context);
  };
}
