// Feature configuration types and defaults for per-event toggleable features

export interface PresentationFeatures {
  teamAvatars: boolean;
  stageDisplay: boolean;
  customThemes: boolean;
  podiumWinners: {
    enabled: boolean;
    topN: number; // configurable: 3, 5, 8, 10, etc.
  };
}

export interface CompetitiveFeatures {
  publicVoting: {
    enabled: boolean;
    weight: number; // 0-100, how much public votes count vs judge scores
  };
  liveReactions: boolean;
  badgesAchievements: boolean;
  momentumIndicators: boolean;
}

export interface JudgeExperienceFeatures {
  judgeComments: boolean;
  bulkScoring: boolean;
  scoreHistory: boolean;
}

export interface LeaderboardVisibilityFeatures {
  scoreBreakdown: {
    enabled: boolean;
    detail: 'none' | 'total' | 'per-criterion' | 'per-judge';
  };
  activityFeed: boolean;
  historicalComparison: boolean;
}

export interface OperationsFeatures {
  scheduledActions: boolean;
  i18n: {
    enabled: boolean;
    languages: string[]; // e.g., ['en', 'es', 'fr']
  };
  embedSupport: boolean;
  teamMessaging: boolean;
  predictiveRankings: boolean;
  printViews: boolean;
  participantProfiles: boolean;
  exportOnDemand: boolean;
  hideLeaderboardUntilRegistrationClosed?: boolean;
}

export interface EventFeatures {
  isEnded?: boolean;
  timerCollapseThresholdMinutes?: number;
  presentation: PresentationFeatures;
  competitive: CompetitiveFeatures;
  judgeExperience: JudgeExperienceFeatures;
  leaderboardVisibility: LeaderboardVisibilityFeatures;
  operations: OperationsFeatures;
}

// Default feature configuration (all features disabled by default)
export const defaultFeatures: EventFeatures = {
  isEnded: false,
  timerCollapseThresholdMinutes: 1,
  presentation: {
    teamAvatars: false,
    stageDisplay: false,
    customThemes: false,
    podiumWinners: {
      enabled: false,
      topN: 3,
    },
  },
  competitive: {
    publicVoting: {
      enabled: false,
      weight: 20,
    },
    liveReactions: false,
    badgesAchievements: false,
    momentumIndicators: false,
  },
  judgeExperience: {
    judgeComments: false,
    bulkScoring: false,
    scoreHistory: false,
  },
  leaderboardVisibility: {
    scoreBreakdown: {
      enabled: false,
      detail: 'total',
    },
    activityFeed: false,
    historicalComparison: false,
  },
  operations: {
    scheduledActions: false,
    i18n: {
      enabled: false,
      languages: ['en'],
    },
    embedSupport: false,
    teamMessaging: false,
    predictiveRankings: false,
    printViews: false,
    participantProfiles: false,
    exportOnDemand: false,
    // Admin preference: hide leaderboard until registrations are closed
    hideLeaderboardUntilRegistrationClosed: false,
  },
};

// Helper to merge stored features with defaults (in case new features are added)
export function mergeFeatures(stored: Partial<EventFeatures> | null | undefined): EventFeatures {
  if (!stored) return defaultFeatures;
  
  return {
    isEnded: stored.isEnded ?? defaultFeatures.isEnded,
    timerCollapseThresholdMinutes: stored.timerCollapseThresholdMinutes ?? defaultFeatures.timerCollapseThresholdMinutes,
    presentation: {
      ...defaultFeatures.presentation,
      ...stored.presentation,
      podiumWinners: {
        ...defaultFeatures.presentation.podiumWinners,
        ...(stored.presentation?.podiumWinners || {}),
      },
    },
    competitive: {
      ...defaultFeatures.competitive,
      ...stored.competitive,
      publicVoting: {
        ...defaultFeatures.competitive.publicVoting,
        ...(stored.competitive?.publicVoting || {}),
      },
    },
    judgeExperience: {
      ...defaultFeatures.judgeExperience,
      ...stored.judgeExperience,
    },
    leaderboardVisibility: {
      ...defaultFeatures.leaderboardVisibility,
      ...stored.leaderboardVisibility,
      scoreBreakdown: {
        ...defaultFeatures.leaderboardVisibility.scoreBreakdown,
        ...(stored.leaderboardVisibility?.scoreBreakdown || {}),
      },
    },
    operations: {
      ...defaultFeatures.operations,
      ...stored.operations,
      i18n: {
        ...defaultFeatures.operations.i18n,
        ...(stored.operations?.i18n || {}),
      },
    },
  };
}

// Feature metadata for UI rendering
export interface FeatureMetadata {
  id: string;
  name: string;
  description: string;
  category: keyof EventFeatures;
  priority: 'high' | 'medium';
  configurable?: {
    type: 'number' | 'text' | 'select' | 'multiselect';
    options?: { label: string; value: any }[];
    min?: number;
    max?: number;
  };
}

export const featureMetadata: FeatureMetadata[] = [
  // Presentation Features (High Priority)
  {
    id: 'presentation.teamAvatars',
    name: 'Team Avatars/Logos',
    description: 'Display custom avatars or logos for teams on the leaderboard',
    category: 'presentation',
    priority: 'high',
  },
  {
    id: 'presentation.stageDisplay',
    name: 'Stage Display Mode',
    description: 'Optimized full-screen view for projectors with larger fonts and animations',
    category: 'presentation',
    priority: 'high',
  },
  {
    id: 'presentation.customThemes',
    name: 'Custom Themes',
    description: 'Allow event creators to customize colors, fonts, and branding',
    category: 'presentation',
    priority: 'high',
  },
  {
    id: 'presentation.podiumWinners',
    name: 'Podium/Winners View',
    description: 'Special view highlighting top N finishers (configurable: top 3, 5, 8, 10, etc.)',
    category: 'presentation',
    priority: 'high',
    configurable: {
      type: 'select',
      options: [
        { label: 'Top 3', value: 3 },
        { label: 'Top 5', value: 5 },
        { label: 'Top 8', value: 8 },
        { label: 'Top 10', value: 10 },
      ],
    },
  },
  // Competitive/Engagement Features (High Priority)
  {
    id: 'competitive.publicVoting',
    name: 'Public/Audience Voting',
    description: 'Let audience vote with configurable weight in final scores',
    category: 'competitive',
    priority: 'high',
    configurable: {
      type: 'number',
      min: 0,
      max: 100,
    },
  },
  {
    id: 'competitive.liveReactions',
    name: 'Live Reactions/Emoji',
    description: 'Allow audience to send reactions that appear on the leaderboard',
    category: 'competitive',
    priority: 'high',
  },
  {
    id: 'competitive.badgesAchievements',
    name: 'Badges & Achievements',
    description: 'Award special badges for milestones (Most Improved, Comeback Kid, etc.)',
    category: 'competitive',
    priority: 'high',
  },
  {
    id: 'competitive.momentumIndicators',
    name: 'Momentum Indicators',
    description: 'Show "hot streak" or "on fire" indicators for rapidly improving teams',
    category: 'competitive',
    priority: 'high',
  },
  // Judge Experience Features (High Priority)
  {
    id: 'judgeExperience.judgeComments',
    name: 'Judge Comments/Feedback',
    description: 'Allow judges to leave text feedback visible to participants or organizers',
    category: 'judgeExperience',
    priority: 'high',
  },
  {
    id: 'judgeExperience.bulkScoring',
    name: 'Bulk Scoring Mode',
    description: 'Enable judges to score multiple teams quickly in a streamlined interface',
    category: 'judgeExperience',
    priority: 'high',
  },
  {
    id: 'judgeExperience.scoreHistory',
    name: 'Score Edit History',
    description: 'Track and display audit trail of score changes by judges',
    category: 'judgeExperience',
    priority: 'high',
  },
  // Leaderboard Visibility Features (High Priority)
  {
    id: 'leaderboardVisibility.scoreBreakdown',
    name: 'Score Breakdown Detail',
    description: 'Show detailed score breakdown (total, per-criterion, or per-judge)',
    category: 'leaderboardVisibility',
    priority: 'high',
    configurable: {
      type: 'select',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Total Only', value: 'total' },
        { label: 'Per Criterion', value: 'per-criterion' },
        { label: 'Per Judge', value: 'per-judge' },
      ],
    },
  },
  {
    id: 'leaderboardVisibility.activityFeed',
    name: 'Activity Feed',
    description: 'Show recent scoring activity and events in real-time',
    category: 'leaderboardVisibility',
    priority: 'high',
  },
  {
    id: 'leaderboardVisibility.historicalComparison',
    name: 'Historical Comparison',
    description: 'Compare current standings to previous rounds',
    category: 'leaderboardVisibility',
    priority: 'high',
  },
  // Operations Features (High Priority)
  {
    id: 'operations.scheduledActions',
    name: 'Scheduled Actions',
    description: 'Schedule automatic round transitions or visibility changes',
    category: 'operations',
    priority: 'high',
  },
  {
    id: 'operations.i18n',
    name: 'Multi-language Support',
    description: 'Display leaderboard in multiple languages',
    category: 'operations',
    priority: 'high',
    configurable: {
      type: 'multiselect',
      options: [
        { label: 'English', value: 'en' },
        { label: 'Spanish', value: 'es' },
        { label: 'French', value: 'fr' },
        { label: 'German', value: 'de' },
        { label: 'Chinese', value: 'zh' },
        { label: 'Japanese', value: 'ja' },
      ],
    },
  },
  {
    id: 'operations.embedSupport',
    name: 'Embed Support',
    description: 'Generate embeddable iframe code for external websites',
    category: 'operations',
    priority: 'high',
  },
  {
    id: 'operations.hideLeaderboardUntilRegistrationClosed',
    name: 'Hide Leaderboard Until Registration Closed',
    description: 'Keep the public leaderboard hidden until organizers close registration',
    category: 'operations',
    priority: 'high',
  },
  {
    id: 'operations.teamMessaging',
    name: 'Team Messaging',
    description: 'Built-in chat for organizers to message teams',
    category: 'operations',
    priority: 'high',
  },
  // Medium Priority Features
  {
    id: 'operations.predictiveRankings',
    name: 'Predictive Rankings',
    description: 'Show projected final rankings based on current trends',
    category: 'operations',
    priority: 'medium',
  },
  {
    id: 'operations.printViews',
    name: 'Print-Friendly Views',
    description: 'Generate printer-optimized reports and certificates',
    category: 'operations',
    priority: 'medium',
  },
  {
    id: 'operations.participantProfiles',
    name: 'Participant Profiles',
    description: 'Detailed profile pages with history across multiple events',
    category: 'operations',
    priority: 'medium',
  },
  {
    id: 'operations.exportOnDemand',
    name: 'On-Demand Data Export',
    description: 'Participants can download their own performance data',
    category: 'operations',
    priority: 'medium',
  },
];

// Helper to get/set nested feature values by dot notation path
export function getFeatureValue(features: EventFeatures, path: string): any {
  const keys = path.split('.');
  let value: any = features;
  for (const key of keys) {
    value = value?.[key];
  }
  return value;
}

export function setFeatureValue(features: EventFeatures, path: string, value: any): EventFeatures {
  const keys = path.split('.');
  const result = JSON.parse(JSON.stringify(features)); // deep clone
  
  let current: any = result;
  for (let i = 0; i < keys.length - 1; i++) {
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
  
  return result;
}
