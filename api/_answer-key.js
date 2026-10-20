export const ANSWER_KEY = {
  1:'B',2:'B',3:'C',4:'D',5:'A',6:'C',7:'B',8:'A',9:'A',10:'B',
  11:'A',12:'B',13:'A',14:'D',15:'C',16:'A',17:'C',18:'A',19:'A',20:'A',
  21:'B',22:'A',23:'A',24:'B',25:'B',26:'B',27:'A',28:'C',29:'B',30:'C',
  31:'A',32:'B',33:'D',34:'C',35:'A',36:'B',37:'B',38:'A',39:'A',40:'A',
  41:'TRUE',42:'FALSE',43:'TRUE',44:'FALSE',45:'TRUE',46:'TRUE',47:'FALSE',48:'TRUE',49:'FALSE',50:'TRUE'
};

export function gradeObjective(answers = {}) {
  return Object.entries(ANSWER_KEY).reduce((score, [id, correct]) => {
    return score + (String(answers[id] || '').toUpperCase() === correct ? 1 : 0);
  }, 0);
}
