// Matching Module 2 objective key. Keep out of browser imports.
// IMPORTANT: a public GitHub repository still exposes committed answers.
export const ANSWER_KEY = {
  1: 'B', 2: 'D', 3: 'A', 4: 'C', 5: 'C', 6: 'A', 7: 'D', 8: 'B', 9: 'A', 10: 'B',
  11: 'C', 12: 'A', 13: 'D', 14: 'B', 15: 'D', 16: 'A', 17: 'B', 18: 'D', 19: 'C', 20: 'A',
  21: 'D', 22: 'B', 23: 'A', 24: 'C', 25: 'C', 26: 'B', 27: 'A', 28: 'D', 29: 'A', 30: 'C',
  31: 'B', 32: 'D', 33: 'D', 34: 'B', 35: 'A', 36: 'C', 37: 'C', 38: 'A', 39: 'B', 40: 'D',
  41: 'FALSE', 42: 'TRUE', 43: 'FALSE', 44: 'FALSE', 45: 'TRUE', 46: 'TRUE', 47: 'TRUE', 48: 'FALSE', 49: 'FALSE', 50: 'TRUE',
};

export function gradeObjective(answers = {}) {
  return Object.entries(ANSWER_KEY).reduce((score, [id, correct]) => {
    return score + (String(answers[id] ?? '').trim().toUpperCase() === correct ? 1 : 0);
  }, 0);
}
