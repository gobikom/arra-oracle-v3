/**
 * Frontmatter parsing: extract tags and project from markdown YAML frontmatter
 */

/**
 * Parse frontmatter tags from markdown content
 * Supports: tags: [a, b, c] or tags: a, b, c
 */
export function parseFrontmatterTags(content: string): string[] {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return [];

  const frontmatter = frontmatterMatch[1];

  // Match tags: [tag1, tag2] or tags: tag1, tag2 or multi-line flow style:
  //   tags: [
  //     "tag1",
  //     "tag2"
  //   ]
  // Grab from 'tags:' to the line end (or closing bracket across newlines), strip
  // surrounding brackets, then split on commas. A bare '[' capture (regex backtrack
  // artifact on multi-line flow style) must never surface as a concept (#124).
  const tagsMatch = frontmatter.match(/^tags:[ \t]*(\[[\s\S]*?\]|[^\n]+)/m);
  if (!tagsMatch) return [];

  return tagsMatch[1]
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map(t => t.trim().replace(/^[\"']+|[\"']+$/g, '').toLowerCase())
    .filter(t => t.length > 0 && t !== '[' && t !== ']');
}

/**
 * Parse frontmatter project from markdown content
 * Returns the project field if found in frontmatter
 * Also extracts project from source field (e.g., "source: rrr: owner/repo")
 */
export function parseFrontmatterProject(content: string): string | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return null;

  const frontmatter = frontmatterMatch[1];

  // First, try direct project: field
  const projectMatch = frontmatter.match(/^project:\s*(.+)$/m);
  if (projectMatch) {
    const project = projectMatch[1].trim();
    // Handle quoted values
    if ((project.startsWith('"') && project.endsWith('"')) ||
        (project.startsWith("'") && project.endsWith("'"))) {
      return project.slice(1, -1);
    }
    return project || null;
  }

  // Fallback: extract from source field (e.g., "source: rrr: owner/repo")
  const sourceMatch = frontmatter.match(/^source:\s*rrr:\s*(.+)$/m);
  if (sourceMatch) {
    const repo = sourceMatch[1].trim();
    if (repo && repo.includes('/')) {
      return `github.com/${repo}`;
    }
  }

  // Fallback: known project patterns in source field
  const sourceField = frontmatter.match(/^source:\s*(.+)$/m);
  if (sourceField) {
    const source = sourceField[1].trim().toLowerCase();
    const sourceMapping = process.env.ORACLE_SOURCE_MAPPINGS;
    if (sourceMapping) {
      try {
        const mappings = JSON.parse(sourceMapping) as Record<string, string>;
        for (const [key, project] of Object.entries(mappings)) {
          if (source.includes(key.toLowerCase())) return project;
        }
      } catch { /* ignore invalid JSON */ }
    }
  }

  return null;
}
