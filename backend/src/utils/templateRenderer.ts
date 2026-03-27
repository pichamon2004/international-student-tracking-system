/**
 * Render a document template body by replacing {{variable}} placeholders.
 * Returns the rendered string and a list of any variables that were missing.
 */
export function renderTemplate(
  body: string,
  variables: Record<string, string>
): { rendered: string; missing: string[] } {
  const missing: string[] = [];
  const rendered = body.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    if (key in variables && variables[key] !== undefined && variables[key] !== '') {
      return variables[key];
    }
    missing.push(`{{${key}}}`);
    return `{{${key}}}`;
  });
  return { rendered, missing };
}

/** Extract all {{variable}} tokens from a template body */
export function extractVariables(body: string): string[] {
  const matches = body.match(/\{\{\w+\}\}/g) ?? [];
  return [...new Set(matches)];
}
