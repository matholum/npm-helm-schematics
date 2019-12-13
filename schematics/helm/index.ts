import _ from 'underscore';

import { Rule, schematic } from '@angular-devkit/schematics';

import { Schema } from './schema';

export default function helm(schema: Schema): Rule {
  const filteredArgs = _.omit(schema, 'chartType');

  return schema.chartType === 'Use a chart from a repository'
    ? schematic('helm-repository', filteredArgs)
    : schematic('helm-local', filteredArgs);
}
