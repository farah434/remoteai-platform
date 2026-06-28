/**
 * AI Job Matching Engine
 * Calculates match score between user skills and job requirements
 */

export function calculateMatchScore(userSkills, jobSkills) {
  if (!userSkills || userSkills.length === 0) return 0;
  if (!jobSkills || jobSkills.length === 0) return 0;

  const userSkillsLower = userSkills.map(s => s.toLowerCase().trim());
  const jobSkillsLower = jobSkills.map(s => s.toLowerCase().trim());

  let matched = 0;
  let partialMatched = 0;

  for (const jobSkill of jobSkillsLower) {
    const exactMatch = userSkillsLower.includes(jobSkill);
    if (exactMatch) {
      matched++;
    } else {
      // partial match: "react" matches "reactjs" etc.
      const partial = userSkillsLower.some(us =>
        us.includes(jobSkill) || jobSkill.includes(us)
      );
      if (partial) partialMatched++;
    }
  }

  const score = ((matched + partialMatched * 0.5) / jobSkillsLower.length) * 100;
  return Math.min(Math.round(score), 99);
}

export function getSkillGap(userSkills, jobSkills) {
  const userSkillsLower = userSkills.map(s => s.toLowerCase().trim());
  return jobSkills.filter(js => {
    const jsl = js.toLowerCase();
    return !userSkillsLower.some(us => us.includes(jsl) || jsl.includes(us));
  });
}

export function getMatchLabel(score) {
  if (score >= 80) return { label: "Excellent Match", color: "#10b981" };
  if (score >= 60) return { label: "Good Match", color: "#6366f1" };
  if (score >= 40) return { label: "Partial Match", color: "#f59e0b" };
  return { label: "Low Match", color: "#ef4444" };
}

export function rankJobsByMatch(jobs, userSkills) {
  return [...jobs]
    .map(job => ({ ...job, matchScore: calculateMatchScore(userSkills, job.skills) }))
    .sort((a, b) => b.matchScore - a.matchScore);
}

export function parseSkillsInput(input) {
  return input
    .split(/[,\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

export function getCareerSuggestions(userSkills) {
  const suggestions = [];
  const sl = userSkills.map(s => s.toLowerCase());

  if (sl.some(s => ['react', 'javascript', 'html', 'css'].includes(s))) {
    if (!sl.includes('typescript'))
      suggestions.push({ skill: 'TypeScript', reason: 'Boosts your frontend salary by 20–30%', icon: '📘' });
    if (!sl.includes('node.js'))
      suggestions.push({ skill: 'Node.js', reason: 'Lets you apply for fullstack roles', icon: '🟢' });
  }
  if (sl.some(s => ['python', 'sql'].includes(s))) {
    if (!sl.includes('pandas'))
      suggestions.push({ skill: 'Pandas', reason: 'Essential for data analyst roles', icon: '🐼' });
    if (!sl.includes('tableau'))
      suggestions.push({ skill: 'Tableau', reason: 'Opens up BI and analytics positions', icon: '📊' });
  }
  if (sl.includes('node.js') || sl.includes('express')) {
    if (!sl.some(s => ['docker', 'aws'].includes(s)))
      suggestions.push({ skill: 'Docker', reason: 'Most backend jobs now require containerization', icon: '🐳' });
  }
  if (suggestions.length === 0) {
    suggestions.push({ skill: 'Communication', reason: 'Soft skills unlock leadership roles', icon: '🗣️' });
    suggestions.push({ skill: 'Git', reason: 'Required for nearly every tech job', icon: '🔀' });
  }
  return suggestions.slice(0, 3);
}
