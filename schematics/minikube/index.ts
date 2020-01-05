import { execSync } from 'child_process';
import path from 'path';
import _ from 'underscore';

import { chain, noop, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { getProjectConfig, updateWorkspaceInTree } from '@nrwl/workspace';

import { Schema } from './schema';

export function check(schema: Schema): Rule {
  return (host: Tree) => {
    const projectConfig = getProjectConfig(host, schema.project);

    if (projectConfig.architect.buildMinikubeImage) {
      throw new Error(`${schema.project} already has a buildMinikubeImage architect option.`);
    }

    return host;
  };
}

export function updateWorkspaceJson(options: Schema): Rule {
  return updateWorkspaceInTree((json: any) => {
    const projectConfig = json.projects[options.project];

    const buildPath = options.buildPath || path.join('dist', projectConfig.root);
    const dockerfile = options.dockerfile || path.join(projectConfig.root, 'dockerfile');
    const dockerignore = options.dockerignore || path.join('.', '.dockerignore');

    const runner = process.argv.length > 2 && process.argv[1].endsWith(`${path.sep}nx`) ? { runner: 'nx' } : {};

    if(projectConfig.architect.build === undefined) {
      throw new Error('You must already have a build target defined when adding minikube to your project!');
    }

    if(projectConfig.architect.build.builder === 'common-schematics:multi-builder') {
      const local = projectConfig.architect.build.configurations.local;

      if(local !== undefined) {
        const previousTargets = local.additionalTargets || [];

        local.additionalTargets = [
          ...previousTargets,
          'buildMinikubeImage'
        ];
      } else {
        projectConfig.architect.build.configurations.local = {
          additionalTargets: ['buildMinikubeImage']
        };
      }
    } else {
      projectConfig.architect.buildSrc = projectConfig.architect.build;
      projectConfig.architect.build = {
        builder: 'common-schematics:multi-builder',
        options: {
          ...runner,
          targets: [ 'buildSrc' ]
        },
        configurations: {
          local: {
            additionalTargets: ['buildMinikubeImage']
          },
          dev: {},
          prod: {}
        }
      };
    }

    projectConfig.architect.buildMinikubeImage = {
      builder: 'helm-schematics:build-minikube-docker',
      options: {
        buildPath,
        dockerfile,
        dockerignore
      }
    };

    return json;
  });
}

export default function helm(schema: Schema): Rule {
  return (host: Tree, context: SchematicContext) => {
    return chain([
      //init(),
      check(schema),
      updateWorkspaceJson(schema)
    ]);
  };
}
