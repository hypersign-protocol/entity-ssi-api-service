#!/usr/bin/env node

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const HTTP_DECORATORS = new Map([
  ['Get', 'GET'],
  ['Post', 'POST'],
  ['Put', 'PUT'],
  ['Patch', 'PATCH'],
  ['Delete', 'DELETE'],
  ['Options', 'OPTIONS'],
  ['Head', 'HEAD'],
  ['All', 'ALL'],
  ['Sse', 'GET'],
]);

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const projectRoot = path.resolve(args.project ?? process.cwd());
  const sourceRoot = path.resolve(projectRoot, args.source ?? 'src');
  const policyPath = path.resolve(projectRoot, args.policy ?? 'credit-catalog.policy.json');
  const outputPath = path.resolve(projectRoot, args.output ?? 'catalog.ssi.json');
  const ts = loadTypeScript(projectRoot);

  const packageJson = readJson(path.join(projectRoot, 'package.json'));
  const policy = readJson(policyPath);
  const discovered = discoverRoutes(ts, sourceRoot, {
    globalPrefix: requiredString(policy.globalPrefix, 'policy.globalPrefix'),
    versioning: policy.versioning ?? 'URI',
    uriVersionPrefix: policy.uriVersionPrefix ?? 'v',
    defaultVersion: String(policy.defaultVersion ?? '1'),
    entryModule: policy.entryModule ?? 'app.module.ts',
  });
  const catalog = buildCatalog(discovered, policy, packageJson.version);
  const serialized = `${JSON.stringify(catalog, null, 2)}\n`;

  if (args.check) {
    if (!fs.existsSync(outputPath)) {
      throw new Error(`Catalog does not exist: ${outputPath}`);
    }
    const current = fs.readFileSync(outputPath, 'utf8');
    if (current !== serialized) {
      throw new Error(
        `Catalog is stale: ${outputPath}\n` +
        'Run the generator without --check and review the resulting diff.',
      );
    }
    process.stdout.write(`Catalog is current (${catalog.routes.length} routes): ${outputPath}\n`);
    return;
  }

  if (args.stdout) {
    process.stdout.write(serialized);
    return;
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, serialized);
  process.stdout.write(`Generated ${catalog.routes.length} routes: ${outputPath}\n`);
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--check') result.check = true;
    else if (value === '--stdout') result.stdout = true;
    else if (['--project', '--source', '--policy', '--output'].includes(value)) {
      const next = argv[index + 1];
      if (!next || next.startsWith('--')) throw new Error(`${value} requires a value`);
      result[value.slice(2)] = next;
      index += 1;
    } else if (value === '--help' || value === '-h') {
      process.stdout.write(
        'Usage: generate-credit-catalog [--project DIR] [--source DIR] ' +
        '[--policy FILE] [--output FILE] [--check|--stdout]\n',
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }
  if (result.check && result.stdout) throw new Error('--check and --stdout cannot be combined');
  return result;
}

function loadTypeScript(projectRoot) {
  try {
    return require(require.resolve('typescript', { paths: [projectRoot, __dirname] }));
  } catch {
    throw new Error(`Cannot resolve TypeScript from ${projectRoot}`);
  }
}

function discoverRoutes(ts, sourceRoot, config) {
  if (!fs.existsSync(sourceRoot)) throw new Error(`Source directory does not exist: ${sourceRoot}`);
  const files = walk(sourceRoot).filter((file) =>
    file.endsWith('.ts') &&
    !file.endsWith('.spec.ts') &&
    !file.endsWith('.d.ts'),
  );
  const registeredControllers = discoverRegisteredControllers(
    ts,
    sourceRoot,
    path.resolve(sourceRoot, config.entryModule),
  );
  const routes = [];

  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    for (const statement of source.statements) {
      if (!ts.isClassDeclaration(statement)) continue;
      const className = statement.name?.text;
      if (!className || !registeredControllers.has(`${file}#${className}`)) continue;
      const controller = findDecorator(ts, statement, 'Controller');
      if (!controller) continue;
      const controllerOptions = controllerMetadata(ts, controller, file);
      const classVersionDecorator = findDecorator(ts, statement, 'Version');
      const classVersion = strictDecoratorValues(ts, classVersionDecorator, '@Version', file);
      const controllerVersions = controllerOptions.versions.length
        ? controllerOptions.versions
        : classVersion.length
          ? classVersion
          : [config.defaultVersion];

      for (const member of statement.members) {
        if (!ts.isMethodDeclaration(member) || !member.name) continue;
        const http = httpDecorator(ts, member);
        if (!http) continue;
        const methodVersionDecorator = findDecorator(ts, member, 'Version');
        const methodVersions = strictDecoratorValues(
          ts,
          methodVersionDecorator,
          '@Version',
          `${file}#${member.name.getText(source)}`,
        );
        const versions = methodVersions.length ? methodVersions : controllerVersions;
        const methodPaths = strictDecoratorValues(
          ts,
          http.decorator,
          `@${decoratorName(ts, http.decorator)}`,
          `${file}#${member.name.getText(source)}`,
          true,
        );
        const resolvedMethodPaths = methodPaths.length ? methodPaths : [''];
        const handler = `${statement.name?.text ?? '<anonymous>'}.${member.name.getText(source)}`;

        for (const controllerPath of controllerOptions.paths) {
          for (const methodPath of resolvedMethodPaths) {
            for (const version of versions) {
              const versionPath = config.versioning === 'URI' && version
                ? `${config.uriVersionPrefix}${version}`
                : '';
              routes.push({
                method: http.method,
                path: normalizePath(config.globalPrefix, versionPath, controllerPath, methodPath),
                source: `${path.relative(sourceRoot, file)}#${handler}`,
              });
            }
          }
        }
      }
    }
  }

  const byKey = new Map();
  for (const route of routes) {
    const key = routeKey(route);
    const existing = byKey.get(key);
    if (existing) {
      throw new Error(`Duplicate discovered route ${key}: ${existing.source}, ${route.source}`);
    }
    byKey.set(key, route);
  }
  return [...byKey.values()].sort((left, right) =>
    left.path.localeCompare(right.path) || left.method.localeCompare(right.method),
  );
}

function discoverRegisteredControllers(ts, sourceRoot, entryModule) {
  const visited = new Set();
  const controllers = new Set();

  function visitModule(file) {
    const resolvedFile = resolveSourceFile(file);
    if (!resolvedFile || visited.has(resolvedFile)) return;
    visited.add(resolvedFile);
    const source = ts.createSourceFile(
      resolvedFile,
      fs.readFileSync(resolvedFile, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const imports = importMap(ts, source, resolvedFile, sourceRoot);
    const moduleClass = source.statements.find((statement) =>
      ts.isClassDeclaration(statement) && findDecorator(ts, statement, 'Module'),
    );
    if (!moduleClass) return;
    const moduleDecorator = findDecorator(ts, moduleClass, 'Module');
    const metadata = callArguments(ts, moduleDecorator)[0];
    if (!metadata || !ts.isObjectLiteralExpression(metadata)) {
      throw new Error(`Unsupported @Module metadata in ${resolvedFile}`);
    }

    const controllerArray = propertyValue(ts, metadata, 'controllers');
    if (controllerArray && ts.isArrayLiteralExpression(controllerArray)) {
      for (const element of controllerArray.elements) {
        if (!ts.isIdentifier(element)) continue;
        const target = imports.get(element.text);
        if (target) controllers.add(`${target.file}#${target.imported}`);
        else controllers.add(`${resolvedFile}#${element.text}`);
      }
    }

    const importsArray = propertyValue(ts, metadata, 'imports');
    if (importsArray && ts.isArrayLiteralExpression(importsArray)) {
      for (const element of importsArray.elements) {
        const identifier = moduleIdentifier(ts, element);
        const target = identifier ? imports.get(identifier) : undefined;
        if (target) visitModule(target.file);
      }
    }
  }

  function resolveSourceFile(target) {
    for (const candidate of [target, `${target}.ts`, path.join(target, 'index.ts')]) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return path.resolve(candidate);
    }
    return undefined;
  }

  visitModule(entryModule);
  if (!visited.size) throw new Error(`Could not resolve entry module: ${entryModule}`);
  return controllers;
}

function importMap(ts, source, sourceFile, sourceRoot) {
  const result = new Map();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteralLike(statement.moduleSpecifier)) continue;
    const targetFile = resolveImportFile(sourceFile, sourceRoot, statement.moduleSpecifier.text);
    if (!targetFile || !statement.importClause) continue;
    const bindings = statement.importClause.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        result.set(element.name.text, {
          file: targetFile,
          imported: element.propertyName?.text ?? element.name.text,
        });
      }
    }
    if (statement.importClause.name) {
      result.set(statement.importClause.name.text, {
        file: targetFile,
        imported: 'default',
      });
    }
  }
  return result;
}

function resolveImportFile(sourceFile, sourceRoot, specifier) {
  let target;
  if (specifier.startsWith('.')) target = path.resolve(path.dirname(sourceFile), specifier);
  else if (specifier.startsWith('src/')) target = path.resolve(sourceRoot, specifier.slice(4));
  else return undefined;
  for (const candidate of [target, `${target}.ts`, path.join(target, 'index.ts')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return path.resolve(candidate);
  }
  return undefined;
}

function moduleIdentifier(ts, expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isCallExpression(expression)) {
    if (ts.isPropertyAccessExpression(expression.expression)) {
      const receiver = expression.expression.expression;
      return ts.isIdentifier(receiver) ? receiver.text : undefined;
    }
    if (ts.isIdentifier(expression.expression) && expression.expression.text === 'forwardRef') {
      const callback = expression.arguments[0];
      if (callback && ts.isArrowFunction(callback) && ts.isIdentifier(callback.body)) return callback.body.text;
    }
  }
  return undefined;
}

function buildCatalog(discovered, policy, packageVersion) {
  const policyRoutes = normalizePolicyRoutes(policy.routes);
  const discoveredKeys = new Set(discovered.map(routeKey));
  const policyKeys = new Set(Object.keys(policyRoutes));
  const unclassified = [...discoveredKeys].filter((key) => !policyKeys.has(key));
  const stale = [...policyKeys].filter((key) => !discoveredKeys.has(key));
  if (unclassified.length || stale.length) {
    const details = [
      ...unclassified.map((key) => `unclassified controller route: ${key}`),
      ...stale.map((key) => `policy route missing from controllers: ${key}`),
    ];
    throw new Error(`Credit catalog policy mismatch:\n- ${details.join('\n- ')}`);
  }

  const routes = discovered.map(({ method, path: routePath }) => {
    const key = `${method} ${routePath}`;
    const entry = policyRoutes[key];
    const charges = Array.isArray(entry) ? entry : entry?.charges;
    if (!Array.isArray(charges)) throw new Error(`${key} must define a charges array`);
    const validatedCharges = charges.map((charge, index) =>
      validateCharge(charge, `${key}.charges[${index}]`));
    const chargeIds = new Set();
    for (const charge of validatedCharges) {
      if (chargeIds.has(charge.id)) throw new Error(`${key} has duplicate charge id ${charge.id}`);
      chargeIds.add(charge.id);
    }
    const result = { method, path: routePath, charges: validatedCharges };
    if (!Array.isArray(entry)) {
      if (entry.operation) result.operation = requiredString(entry.operation, `${key}.operation`);
      if (entry.boundary !== undefined) {
        if (typeof entry.boundary !== 'boolean') throw new Error(`${key}.boundary must be boolean`);
        result.boundary = entry.boundary;
      }
    }
    return result;
  });

  return {
    serviceType: requiredString(policy.serviceType, 'policy.serviceType'),
    version: requiredString(policy.version ?? packageVersion, 'catalog version'),
    globalPrefix: requiredString(policy.globalPrefix, 'policy.globalPrefix'),
    versioning: policy.versioning ?? 'URI',
    uriVersionPrefix: policy.uriVersionPrefix ?? 'v',
    defaultVersion: String(policy.defaultVersion ?? '1'),
    routes,
  };
}

function normalizePolicyRoutes(routes) {
  if (Array.isArray(routes)) {
    const result = {};
    for (const route of routes) {
      if (!route || typeof route !== 'object') throw new Error('policy.routes entries must be objects');
      const method = requiredString(route.method, 'policy route method').toUpperCase();
      const routePath = normalizePath(requiredString(route.path, 'policy route path'));
      const key = `${method} ${routePath}`;
      if (result[key]) throw new Error(`Duplicate policy route ${key}`);
      result[key] = {
        charges: route.charges,
        ...(route.operation ? { operation: route.operation } : {}),
        ...(route.boundary !== undefined ? { boundary: route.boundary } : {}),
      };
    }
    return result;
  }
  if (!routes || typeof routes !== 'object') {
    throw new Error('policy.routes must be an array or an object keyed by "METHOD /path"');
  }
  return routes;
}

function validateCharge(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }
  const charge = {
    id: requiredString(value.id, `${field}.id`),
    creditType: requiredString(value.creditType, `${field}.creditType`),
    amount: value.amount,
  };
  if (!Number.isSafeInteger(charge.amount) || charge.amount <= 0) {
    throw new Error(`${field}.amount must be a positive safe integer`);
  }
  if (value.settlementMode !== undefined) {
    if (!['IMMEDIATE', 'DEFERRED'].includes(value.settlementMode)) {
      throw new Error(`${field}.settlementMode must be IMMEDIATE or DEFERRED`);
    }
    charge.settlementMode = value.settlementMode;
  }
  if (value.autoRecover !== undefined) {
    if (typeof value.autoRecover !== 'boolean') {
      throw new Error(`${field}.autoRecover must be boolean`);
    }
    if (value.autoRecover === false && value.settlementMode !== 'DEFERRED') {
      throw new Error(`${field}.autoRecover=false requires DEFERRED settlement`);
    }
    charge.autoRecover = value.autoRecover;
  }
  if (value.when !== undefined) {
    charge.when = validateCondition(value.when, `${field}.when`);
  }
  return charge;
}

function validateCondition(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }
  if (value.source !== 'body') throw new Error(`${field}.source must be body`);
  const conditionPath = requiredString(value.path, `${field}.path`);
  const safeSegments = conditionPath.split('.').every((segment) =>
    /^[A-Za-z0-9_-]+$/.test(segment) &&
    !['__proto__', 'prototype', 'constructor'].includes(segment));
  if (!safeSegments) throw new Error(`${field}.path must be a safe property path`);
  if (!['equals', 'notEquals', 'exists'].includes(value.operator)) {
    throw new Error(`${field}.operator must be equals, notEquals, or exists`);
  }
  const hasValue = Object.prototype.hasOwnProperty.call(value, 'value');
  if (value.operator === 'exists') {
    if (hasValue) throw new Error(`${field}.value must be omitted for exists`);
    return {
      source: value.source,
      path: conditionPath,
      operator: value.operator,
    };
  }
  const valueType = typeof value.value;
  if (!hasValue || (value.value !== null &&
      !['string', 'number', 'boolean'].includes(valueType)) ||
      (valueType === 'number' && !Number.isFinite(value.value))) {
    throw new Error(`${field}.value must be a string, number, boolean, or null`);
  }
  return {
    source: value.source,
    path: conditionPath,
    operator: value.operator,
    value: value.value,
  };
}

function controllerMetadata(ts, decorator, file) {
  const args = callArguments(ts, decorator);
  if (args.length === 0) return { paths: [''], versions: [] };
  const first = args[0];
  if (ts.isObjectLiteralExpression(first)) {
    const pathProperty = propertyValue(ts, first, 'path');
    const versionProperty = propertyValue(ts, first, 'version');
    return {
      paths: literalValues(ts, pathProperty).length ? literalValues(ts, pathProperty) : [''],
      versions: literalValues(ts, versionProperty),
    };
  }
  const paths = literalValues(ts, first);
  if (!paths.length) throw new Error(`Unsupported @Controller argument in ${file}`);
  return { paths, versions: [] };
}

function httpDecorator(ts, node) {
  for (const [name, method] of HTTP_DECORATORS) {
    const decorator = findDecorator(ts, node, name);
    if (decorator) return { decorator, method };
  }
  return undefined;
}

function findDecorator(ts, node, expectedName) {
  const decorators = ts.canHaveDecorators
    ? ts.getDecorators(node) ?? []
    : node.decorators ?? [];
  // Legacy TypeScript class decorators execute bottom-to-top. When duplicate
  // metadata decorators exist, the first one in source order wins at runtime.
  return decorators.find((decorator) => decoratorName(ts, decorator) === expectedName);
}

function decoratorName(ts, decorator) {
  const expression = ts.isCallExpression(decorator.expression)
    ? decorator.expression.expression
    : decorator.expression;
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return undefined;
}

function decoratorValues(ts, decorator) {
  if (!decorator) return [];
  const args = callArguments(ts, decorator);
  return args.flatMap((argument) => literalValues(ts, argument));
}

function strictDecoratorValues(ts, decorator, name, location, allowNoArguments = false) {
  if (!decorator) return [];
  const args = callArguments(ts, decorator);
  if (allowNoArguments && args.length === 0) return [];
  const values = args.flatMap((argument) => literalValues(ts, argument));
  if (!values.length) throw new Error(`Unsupported ${name} value in ${location}`);
  return values;
}

function callArguments(ts, decorator) {
  return ts.isCallExpression(decorator.expression) ? [...decorator.expression.arguments] : [];
}

function propertyValue(ts, object, name) {
  const property = object.properties.find((candidate) =>
    ts.isPropertyAssignment(candidate) && candidate.name.getText().replace(/["']/g, '') === name,
  );
  return property?.initializer;
}

function literalValues(ts, node) {
  if (!node) return [];
  if (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return [node.text];
  if (ts.isArrayLiteralExpression(node)) return node.elements.flatMap((value) => literalValues(ts, value));
  return [];
}

function normalizePath(...parts) {
  const joined = parts.filter((part) => String(part ?? '').trim()).join('/');
  const normalized = `/${joined}`.replace(/\/+/g, '/');
  return normalized.length > 1 && normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

function routeKey(route) {
  return `${route.method} ${route.path}`;
}

function walk(directory) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...walk(target));
    else if (entry.isFile()) result.push(target);
  }
  return result;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read JSON ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function requiredString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required`);
  return value.trim();
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

module.exports = { buildCatalog, discoverRoutes, normalizePath, parseArgs };
