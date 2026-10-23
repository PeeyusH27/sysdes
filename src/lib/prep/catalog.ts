// Everything the readiness map, the plan and the mock rounds need to know about the site's content, as plain data.
// Built on the server (it reads problems and exercises from disk) and passed to client components.
import { deepDives, learnSteps, questions } from "@content/registry";
import { patterns } from "@content/dsa/registry";
import { lldLessons, questionExercises } from "@content/lld/registry";
import { csLessons } from "@content/cs/registry";
import { isLowLevel, questionLabel } from "@content/home";
import { getExtras } from "@content/extras";
import { challenges } from "@/components/playground/challenges";
import { getMission } from "@/components/playground/missions";
import { loadExercises, loadProblems, type LoadedProblem } from "@/lib/dsa/load";

export * from "./catalog-types";
import { EXERCISE_MINUTES, PROBLEM_MINUTES, type Catalog, type CatalogItem } from "./catalog-types";

const problemItem = (p: LoadedProblem): CatalogItem => ({
  slug: p.slug,
  key: p.slug,
  title: p.meta.title,
  difficulty: p.meta.difficulty,
  minutes: PROBLEM_MINUTES[p.meta.difficulty],
  href: `/dsa/problems/${p.slug}`,
});
const exerciseItem = (p: LoadedProblem): CatalogItem => ({
  slug: p.slug,
  key: `lld:${p.slug}`,
  title: p.meta.title,
  difficulty: p.meta.difficulty,
  minutes: EXERCISE_MINUTES[p.meta.difficulty],
  href: `/lld/exercises/${p.slug}`,
});

export function buildCatalog(): Catalog {
  const problems = loadProblems();
  const exercises = loadExercises().map(exerciseItem);
  return {
    patterns: patterns.map((p) => ({
      slug: p.slug,
      title: p.title,
      short: p.short,
      group: p.group,
      minutes: p.minutes,
      problems: problems.filter((x) => x.meta.patterns.includes(p.slug)).map(problemItem),
    })),
    learn: learnSteps.map((s) => ({ slug: s.slug, title: s.title, minutes: s.minutes })),
    deepDives: deepDives.map((d) => ({ slug: d.slug, title: d.title, minutes: d.minutes })),
    questions: questions.map((q) => ({
      slug: q.slug,
      title: q.title,
      label: questionLabel(q.title),
      level: q.level,
      minutes: q.minutes,
      lld: isLowLevel(q),
      challenge: q.challenge,
      exercises: questionExercises[q.slug] ?? [],
      explain: !!getExtras("questions", q.slug)?.explain,
    })),
    lldLessons: lldLessons.map((l) => ({
      slug: l.slug,
      title: l.title,
      short: l.short,
      minutes: l.minutes,
      exercises: loadExercises().filter((e) => e.meta.patterns.includes(l.slug)).map(exerciseItem),
    })),
    csLessons: csLessons.map((l) => ({ slug: l.slug, title: l.title, short: l.short, group: l.group, minutes: l.minutes })),
    exercises,
    challenges: challenges.map((c) => ({ slug: c.slug, title: c.title, missionSteps: getMission(c.slug)?.steps.length ?? 0, learn: c.learn })),
  };
}
