import { deepAnalysisStrategy } from './deep.js';
import { standardAnalysisStrategy } from './standard.js';

const analysisStrategies = {
  standard: standardAnalysisStrategy,
  deep: deepAnalysisStrategy,
};

export function getAnalysisStrategy(mode) {
  return analysisStrategies[mode] || standardAnalysisStrategy;
}
