const genericQuestionPatterns = [/优先级/, /还有什么/, /怎么规划/, /详细说说/, /你的感受/];
const learningGoalPattern = /(?:想|要|准备|开始|计划|希望).{0,8}(?:学|学习|学会|掌握|练习|提升)|(?:学习|学会|掌握|练习|提升).{0,16}/;
const startingPointPattern = /零基础|新手|初学|会做|不会|水平|基础|做过|经验|已经学/;
const timeFramePattern = /今天|明天|本周|下周|本月|下月|月底|每天|每周|周末|几天|多久|一[个]?月|两[个]?月|\d+\s*(?:天|周|月|小时|分钟)/;

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, maxLength) : '';
}

function uniqueOptions(options) {
  const seen = new Set();
  return options.filter((option) => {
    const key = option.toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeClarificationQuestions(parsed, originalInput, questionLimit) {
  if (parsed?.type !== 'clarify' || questionLimit <= 0 || !Array.isArray(parsed.questions)) {
    return [];
  }

  const normalizedOriginal = String(originalInput || '').replace(/\s+/g, ' ');
  const seenQuestionTexts = new Set();
  return parsed.questions
    .map((question, index) => {
      const evidence = cleanText(question?.evidence, 40);
      const text = cleanText(question?.text, 52);
      const options = uniqueOptions(
        (Array.isArray(question?.options) ? question.options : [])
          .map((option) => cleanText(option, 26))
          .filter((option) => option.length >= 2 && !/^(其他|补充|自由输入|我不确定)$/.test(option)),
      ).slice(0, 3);

      const hasGenericQuestion = genericQuestionPatterns.some((pattern) => pattern.test(text));
      if (!evidence || !normalizedOriginal.includes(evidence) || text.length < 6 || hasGenericQuestion || options.length < 2) {
        return null;
      }

      return {
        id: `${cleanText(question?.id, 30) || 'question'}-${index + 1}`,
        evidence,
        text,
        options,
      };
    })
    .filter((question) => {
      if (!question) return false;
      const key = question.text.toLocaleLowerCase();
      if (seenQuestionTexts.has(key)) return false;
      seenQuestionTexts.add(key);
      return true;
    })
    .slice(0, questionLimit);
}

export function needsGoalClarification(input) {
  const source = String(input || '').replace(/\s+/g, ' ').trim();
  if (!learningGoalPattern.test(source)) return false;
  return !startingPointPattern.test(source) || !timeFramePattern.test(source);
}
