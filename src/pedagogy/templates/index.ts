export type { SceneTemplate, SceneBuild, TemplateParameter } from './types.ts';
export { STARTER_TEMPLATES } from './starters.ts';

import { STARTER_TEMPLATES } from './starters.ts';

export function getTemplateById(id: string) {
  return STARTER_TEMPLATES.find((t) => t.id === id) ?? null;
}
