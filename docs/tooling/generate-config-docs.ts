#!/usr/bin/env -S npx tsx
/**
 * Regenerates the field-by-field config reference table in docs/configuration.md
 * from server/src/config/AppConfig.ts, cross-referenced with the hand-curated
 * descriptions/defaults in docs/tooling/config-descriptions.yaml.
 *
 * Usage:
 *   npx tsx docs/tooling/generate-config-docs.ts generate   # rewrite the generated block
 *   npx tsx docs/tooling/generate-config-docs.ts --check    # exit 1 if docs/configuration.md is stale
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as parseYaml } from 'js-yaml';
import { InterfaceDeclaration, Project, Scope, SourceFile } from 'ts-morph';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const APP_CONFIG_PATH = path.join(REPO_ROOT, 'server/src/config/AppConfig.ts');
const MANIFEST_PATH = path.join(__dirname, 'config-descriptions.yaml');
const CONFIGURATION_MD_PATH = path.join(REPO_ROOT, 'docs/installation/configuration.md');

const BEGIN_MARKER = '<!-- BEGIN GENERATED CONFIG REFERENCE -->';
const END_MARKER = '<!-- END GENERATED CONFIG REFERENCE -->';

interface FieldInfo {
  section: string;
  field: string;
  type: string;
}

interface ManifestEntry {
  required: boolean;
  default?: string;
  description: string;
}

// Sections can nest local config interfaces (e.g. WorkersConfig.stepExecution:
// StepExecutionConfig) — recurse into those so leaf fields like
// workers.stepExecution.batchSize get their own documented row, instead of
// rendering the nested interface name as an opaque "type".
function collectFields(iface: InterfaceDeclaration, sourceFile: SourceFile, sectionPath: string, fields: FieldInfo[]): void {
  for (const sig of iface.getProperties()) {
    const typeName = sig.getType().getSymbol()?.getName();
    const nestedIface = typeName ? sourceFile.getInterface(typeName) : undefined;

    if (nestedIface) {
      collectFields(nestedIface, sourceFile, `${sectionPath}.${sig.getName()}`, fields);
    } else {
      fields.push({
        section: sectionPath,
        field: sig.getName(),
        type: sig.getTypeNode()?.getText() ?? sig.getType().getText(),
      });
    }
  }
}

function extractFields(): FieldInfo[] {
  const project = new Project({ tsConfigFilePath: path.join(REPO_ROOT, 'server/tsconfig.json') });
  const sourceFile = project.getSourceFileOrThrow(APP_CONFIG_PATH);
  const appConfigClass = sourceFile.getClassOrThrow('AppConfig');

  const fields: FieldInfo[] = [];

  // AppConfig also carries private implementation fields for its live-
  // settings poll loop (e.g. `live`, `uowFactory`, `running`) — only its
  // public properties represent documented config.yaml sections.
  for (const prop of appConfigClass.getProperties()) {
    if (prop.getScope() !== Scope.Public) continue;

    const section = prop.getName();
    const typeName = prop.getType().getSymbol()?.getName();
    if (!typeName) {
      throw new Error(`Could not resolve interface type for AppConfig.${section}`);
    }

    const iface = sourceFile.getInterfaceOrThrow(typeName);
    collectFields(iface, sourceFile, section, fields);
  }

  return fields;
}

function loadManifest(): Map<string, ManifestEntry> {
  const raw = parseYaml(readFileSync(MANIFEST_PATH, 'utf8')) as unknown as Record<string, ManifestEntry>;
  return new Map(Object.entries(raw));
}

function renderTable(fields: FieldInfo[], manifest: Map<string, ManifestEntry>): string {
  const bySection = new Map<string, FieldInfo[]>();
  for (const f of fields) {
    bySection.set(f.section, [...(bySection.get(f.section) ?? []), f]);
  }

  const lines: string[] = [];
  for (const [section, sectionFields] of bySection) {
    lines.push(`### \`${section}\``, '');
    lines.push('| Field | Type | Required | Default | Description |');
    lines.push('|---|---|---|---|---|');
    for (const f of sectionFields) {
      const key = `${f.section}.${f.field}`;
      const entry = manifest.get(key)!;
      const required = entry.required ? 'Yes' : 'No';
      const def = entry.default ?? '-';
      lines.push(`| \`${f.field}\` | \`${f.type}\` | ${required} | ${def} | ${entry.description} |`);
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd() + '\n';
}

function applyToFile(currentContent: string, generatedBlock: string): string {
  const beginIdx = currentContent.indexOf(BEGIN_MARKER);
  const endIdx = currentContent.indexOf(END_MARKER);
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
    throw new Error(
      `docs/configuration.md is missing the ${BEGIN_MARKER} / ${END_MARKER} markers`,
    );
  }
  const before = currentContent.slice(0, beginIdx + BEGIN_MARKER.length);
  const after = currentContent.slice(endIdx);
  return `${before}\n\n${generatedBlock}\n${after}`;
}

function main(): void {
  const mode = process.argv[2];
  if (mode !== 'generate' && mode !== '--check') {
    console.error('Usage: generate-config-docs.ts <generate|--check>');
    process.exit(1);
  }

  const fields = extractFields();
  const manifest = loadManifest();

  const missing = fields
    .map((f) => `${f.section}.${f.field}`)
    .filter((key) => !manifest.has(key));
  if (missing.length > 0) {
    console.error('Missing docs/tooling/config-descriptions.yaml entries for:');
    for (const key of missing) console.error(`  - ${key}`);
    process.exit(1);
  }

  const generatedBlock = renderTable(fields, manifest);
  const currentContent = readFileSync(CONFIGURATION_MD_PATH, 'utf8');
  const nextContent = applyToFile(currentContent, generatedBlock);

  if (mode === 'generate') {
    writeFileSync(CONFIGURATION_MD_PATH, nextContent);
    console.log('docs/installation/configuration.md generated block updated.');
    return;
  }

  // --check
  if (nextContent !== currentContent) {
    console.error(
      'docs/installation/configuration.md is out of date with server/src/config/AppConfig.ts.\n' +
        'Run: npm run docs:generate-config',
    );
    process.exit(1);
  }
  console.log('docs/installation/configuration.md is up to date.');
}

main();
