export const MAX_CLARIFICATION_QUESTIONS = 8;
export const MAX_QUESTIONS_PER_ROUND = 2;
export const MAX_AGENT_FOCUS_AREAS = 4;

const genericQuestionPatterns = [/优先级/, /还有什么/, /怎么规划/, /详细说说/, /你的感受/];
const learningGoalPattern = /(?:想|要|准备|开始|计划|希望).{0,8}(?:学|学习|学会|掌握|练习|提升)|(?:学习|学会|掌握|练习|提升).{0,16}/;
const startingPointPattern = /零基础|新手|初学|会做|不会|水平|基础|做过|经验|已经学/;
const timeFramePattern = /今天|明天|本周|下周|本月|下月|月底|每天|每周|周末|几天|多久|一[个]?月|两[个]?月|\d+\s*(?:天|周|月|小时|分钟)/;

export const ROUTING_CONTRACT = `
你必须只输出一个 JSON object，type 只能是 "clarify" 或 "plan"。

当 type 为 "clarify" 时，格式必须是：
{"type":"clarify","questions":[{"id":"英文或数字短标识","evidence":"原始输入中的连续原文","text":"一句具体问题","options":["选项一","选项二","选项三"]}]}


当 clarification_state.must_clarify_before_planning 为 true 时，必须输出 type 为 clarify，不能直接输出计划，即使你能猜到一个简单的下一步。对于学习一项技能但缺少起点或时间范围的输入，优先问当前基础、准备投入多久或希望学到什么程度，问题必须仍然紧贴原文。

你是一个有限规划 Agent，不是逐项盘问器。严格遵循“观察原文和已选答案 → 排序不确定点 → 每次只追问一个问题 → 重新判断是否已足够 → 收束为计划”的循环。当用户一次说了很多任务时，先在内部按“硬截止、会阻塞多件事、代价或情绪负荷高、用户明确反复提及”的顺序排序，只挑最影响最终安排的 ${MAX_AGENT_FOCUS_AREAS} 个不确定主题追问。不要为了覆盖每件事而提问；较次要或信息足够的事项直接纳入计划。已确认一个主题后，除非它仍阻塞安排，不要换一种说法重复追问。一旦已有信息可以给出可信、留有缓冲的安排，立即输出计划。

只有缺失的信息会实质改变下一步或排程时才允许 clarify。每次最多 ${MAX_QUESTIONS_PER_ROUND} 个问题，且问题总数不能超过 ${MAX_CLARIFICATION_QUESTIONS} 个。每个问题必须围绕用户原始输入中一个具体事项、时间、人物、地点或阻碍；evidence 必须逐字摘自原始输入。不要问优先级、性格、情绪原因、泛泛的规划方式，也不要重复已经回答的信息。options 必须是 2 到 3 个简短、可直接点击的具体答案，不要包含“其他”“补充”“自由输入”或“我不确定”，界面会自行补上这些选择。

当 type 为 "plan" 时，严格按以下格式输出：
{"type":"plan","summary":"","schedule":[{"date":"YYYY-MM-DD","time":"HH:mm-HH:mm","title":"","hint":"","estimated_minutes":30,"buffer_minutes":30,"completed":false}],"later":[]}。
summary 只能一句话，18 个中文字以内，必须鼓励、安定、不夸张。schedule 是最终核心，按日期时间升序。小而明确的一件事可只排 1 到 3 条；普通事项排 3 到 5 条；事情多或笼统时才排 6 到 10 条。time 必须精确为 HH:mm-HH:mm，且表示已包含缓冲的完整预留时间窗口；estimated_minutes 是纯执行分钟数，buffer_minutes 是已包含在 time 中的缓冲分钟数，二者为正整数。buffer_minutes 不得少于 15 分钟。每条 title 是用户唯一会看到的待办文字，18 个中文字以内，动词开头，具体到下一步动作。每条 hint 必填，最多 26 个中文字，是紧贴该待办的一句具体起步方法，不重复 title、不讲道理、不写长段建议。例如 title 为“找入门教学”，hint 可以是“在视频平台搜‘零基础画画教程’”。不要输出 Markdown、分析、解释或未定义字段。`;

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

export function normalizeClarificationQuestions(parsed, originalInput, remainingQuestions) {
  if (parsed?.type !== 'clarify' || remainingQuestions <= 0 || !Array.isArray(parsed.questions)) {
    return [];
  }

  const normalizedOriginal = String(originalInput || '').replace(/\s+/g, ' ');
  return parsed.questions
    .slice(0, Math.min(MAX_QUESTIONS_PER_ROUND, remainingQuestions))
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
    .filter(Boolean);
}

export function needsGoalClarification(input) {
  const source = String(input || '').replace(/\s+/g, ' ').trim();
  if (!learningGoalPattern.test(source)) return false;
  return !startingPointPattern.test(source) || !timeFramePattern.test(source);
}

export function getReasoningStrategy({ input, answerCount = 0, questionCount = 0, forcePlan = false, requireClarification = false }) {
  const source = String(input || '');
  const structureCount = (source.match(/[，、；。！？\n]/g) || []).length;
  const constraintCount = (source.match(/今天|明天|本周|下周|月底|截止|必须|同时|另外|还有|以及|一边|论文|答辩|工作|面试|搬家|客户/g) || [])
    .length;

  if ((forcePlan && questionCount >= 4) || source.length >= 360 || structureCount + constraintCount >= 8) {
    return 'deep-max';
  }

  if (requireClarification || source.length >= 140 || structureCount + constraintCount >= 4 || answerCount >= 2) {
    return 'deep';
  }

  return 'fast';
}
