/**
 * Snapshots the document templates the demo uses (and their request types and all
 * template variables) from the current database into demo-data/templates.json,
 * which seed-demo.ts loads. Re-run after editing a template in the app to keep
 * the demo seed in step:
 *   npx ts-node --transpile-only prisma/export-demo-templates.ts
 */
import { PrismaClient } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

// Leave Request Form, Report of Arrival, หนังสือขอเปิดบัญชีธนาคาร (ไทยพาณิชย์)
const TEMPLATE_NAMES = [
  'Leave Request Form',
  'Report of Arrival for International Student',
  'หนังสือขอเปิดบัญชีธนาคาร (ไทยพาณิชย์)',
];

async function main() {
  const templates = await prisma.documentTemplate.findMany({
    where: { name: { in: TEMPLATE_NAMES }, isActive: true },
    include: { requestTypes: { where: { isActive: true } } },
    orderBy: { id: 'asc' },
  });
  const missing = TEMPLATE_NAMES.filter(n => !templates.some(t => t.name === n));
  if (missing.length) throw new Error(`Templates not found: ${missing.join(', ')}`);

  const variables = await prisma.templateVariable.findMany({ orderBy: { id: 'asc' } });

  const data = {
    templates: templates.map(t => ({
      name: t.name,
      description: t.description,
      body: t.body,
      variables: t.variables,
      signingMethod: t.signingMethod,
      requestTypes: t.requestTypes.map(rt => ({ name: rt.name, description: rt.description, icon: rt.icon })),
    })),
    variables: variables.map(v => ({
      key: v.key,
      label: v.label,
      description: v.description,
      inputType: v.inputType,
      options: v.options,
    })),
  };

  const dir = join(__dirname, 'demo-data');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'templates.json'), JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`✅ ${data.templates.length} templates, ${data.variables.length} variables → prisma/demo-data/templates.json`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
