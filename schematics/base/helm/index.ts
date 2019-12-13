import path from 'path';
import _ from 'underscore';

import { Rule, Tree } from '@angular-devkit/schematics';
import { getProjectConfig, updateWorkspaceInTree } from '@nrwl/workspace';

export interface HelmOptions {
    project: string;
    buildPath: string;
    createValues: boolean;
    repository: string;
    chart: string;
    isLocalChart: boolean;
}

export function check(options: HelmOptions): Rule {
  return (host: Tree) => {
    const projectConfig = getProjectConfig(host, options.project);

    if (projectConfig.architect.buildHelmScript) {
      throw new Error(`${options.project} already has a buildHelmScript architect option.`);
    }

    if (projectConfig.architect.runHelmScript) {
      throw new Error(`${options.project} already has a runHelmScript architect option.`);
    }

    return host;
  };
}

export function addHelmToWorkspaceJson(options: HelmOptions): Rule {
  return updateWorkspaceInTree((json: any) => {
    const projectConfig = json.projects[options.project];

    const buildPath = options.buildPath || path.join('dist', projectConfig.root);

    const runner = process.argv.length > 2 && process.argv[1].endsWith(`${path.sep}nx`) ? { runner: 'nx' } : {};

    const multiBuild = {
      builder: 'common-schematics:multi-builder',
      options: {
        ...runner,
        targets: [ 'buildSrc', 'buildHelmScript']
      },
      configurations: {
        dev: {},
        prod: {} as any
      }
    };

    const buildHelmScript: any = {
      builder: 'helm-schematics:build-deploy-script',
      options: {
        repository: options.repository,
        chart: options.chart,
        buildPath
      },
      configurations: {
        dev: {},
        prod: {}
      }
    };

    const runHelmScript: any = {
      builder: 'helm-schematics:run-deploy-script',
      options: {
        repository: options.repository,
        chart: options.chart
      },
      configurations: {
        dev: {},
        prod: {}
      }
    };

    if(options.isLocalChart || options.createValues) {
      const projectHelmPath = path.join(projectConfig.root, 'helm');

      buildHelmScript.options.projectHelmPath = projectHelmPath;
      runHelmScript.options.projectHelmPath = projectHelmPath;

      if(options.isLocalChart) {
        runHelmScript.options.chart = path.join(projectConfig.root, options.chart);
      }
    }

    if(projectConfig.architect.build !== undefined) {
      if(projectConfig.architect.build.builder === 'common-schematics:multi-builder') {
        projectConfig.architect.build.options.targets.push('buildHelmScript');
      } else {
        projectConfig.architect.buildSrc = projectConfig.architect.build;
        projectConfig.architect.build = multiBuild;
      }

      projectConfig.architect.buildHelmScript = buildHelmScript;
    } else {
      projectConfig.architect.build = buildHelmScript;
    }

    projectConfig.architect.runHelmScript = runHelmScript;

    return json;
  });
}
