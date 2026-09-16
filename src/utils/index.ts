export { updateGitignoreForModule, updateGitignoreForModules, getGitRoot } from './gitignore.js';
export {
  hasUncommittedChanges,
  countUnpushedCommits,
  countRemoteNewCommits,
  copyDir,
  attachDirToRemote,
  getDetailedChanges,
  getUnpushedCommitDetails,
} from './git.js';
export { countFilesAndSize } from './file-stats.js';
export { detectModuleIssues, isGitDirectoryHealthy } from './module-health.js';
