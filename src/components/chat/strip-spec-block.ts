/**
 * Strip the ```json:research_spec ... ``` block from chat content
 * so raw JSON doesn't show in the conversation UI.
 */
export function stripSpecBlock(content: string): string {
  // Remove the fenced code block and any surrounding blank lines
  return content
    .replace(/```json:research_spec\n[\s\S]*?\n```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
