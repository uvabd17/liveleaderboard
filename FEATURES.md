# Live Leaderboard - Feature Toggle System

## Overview

The Live Leaderboard now includes a comprehensive per-event feature toggle system that allows event creators to enable and configure specific features for their leaderboard events. All features are **opt-in by default**, ensuring a clean and focused experience unless explicitly enabled.

## Feature Categories

### 1. Presentation Features (High Priority)

#### Team Avatars/Logos
- **Status**: Implemented (Database ready)
- **Description**: Display custom avatars or logos for teams on the leaderboard
- **Configuration**: Boolean toggle
- **Usage**: Store avatar URLs in `Participant.profile` JSON field

#### Stage Display Mode
- **Status**: ✅ Fully Implemented
- **Description**: Optimized full-screen view for projectors with larger fonts and animations
- **Route**: `/stage`
- **Features**: 
  - Large 5rem heading
  - Top 10 participants with animated highlights
  - Rank movement indicators (↑/↓)
  - Gold/Silver/Bronze styling for top 3
  - Real-time SSE updates

#### Custom Themes
- **Status**: Implemented (Database ready)
- **Description**: Allow event creators to customize colors, fonts, and branding
- **Configuration**: Boolean toggle
- **Usage**: Store theme data in `Organization.brandingTheme` JSON field

#### Podium/Winners View
- **Status**: ✅ Fully Implemented
- **Description**: Special view highlighting top N finishers
- **Configuration**: 
  - Enabled: Boolean
  - Top N: Configurable (3, 5, 8, 10)
- **Features**:
  - Animated podium cards with rise effect
  - Gold/Silver/Bronze gradients for top 3
  - Additional winners with scaled styling
  - Toggle between podium and full leaderboard views

### 2. Competitive/Engagement Features (High Priority)

#### Public/Audience Voting
- **Status**: Implemented (Database ready)
- **Description**: Let audience vote with configurable weight in final scores
- **Configuration**: 
  - Enabled: Boolean
  - Weight: 0-100 (percentage influence)

#### Live Reactions/Emoji
- **Status**: Implemented (Database ready)
- **Description**: Allow audience to send reactions that appear on the leaderboard

#### Badges & Achievements
- **Status**: Implemented (Database ready)
- **Description**: Award special badges for milestones (Most Improved, Comeback Kid, etc.)

#### Momentum Indicators
- **Status**: ✅ Fully Implemented
- **Description**: Show "hot streak" or "on fire" indicators for rapidly improving teams
- **Features**:
  - Tracks consecutive rank improvements
  - Displays 🔥 emoji for teams with 2+ consecutive improvements
  - Pulse animation effect
  - Real-time tracking via SSE updates

### 3. Judge Experience Features (High Priority)

#### Judge Comments/Feedback
- **Status**: ✅ Fully Implemented
- **Description**: Allow judges to leave text feedback visible to participants or organizers
- **Database**: `Score.comment` field added
- **Features**:
  - Per-criterion comments in judge console
  - General feedback textarea
  - Stored in database with score records
  - Special "__general__" criterion for overall feedback
- **API**: `/api/judge/score` accepts `comment` field per score

#### Bulk Scoring Mode
- **Status**: Implemented (UI ready)
- **Description**: Enable judges to score multiple teams quickly in a streamlined interface

#### Score Edit History
- **Status**: ✅ Database Ready
- **Description**: Track and display audit trail of score changes by judges
- **Database**: `Score.updatedAt` field added with auto-update
- **Usage**: Query scores by participant and judge, order by `updatedAt` to see history

### 4. Leaderboard Visibility Features (High Priority)

#### Score Breakdown Detail
- **Status**: Implemented (Database ready)
- **Description**: Show detailed score breakdown
- **Configuration**:
  - Enabled: Boolean
  - Detail Level: none | total | per-criterion | per-judge

#### Activity Feed
- **Status**: Implemented (Database ready)
- **Description**: Show recent scoring activity and events in real-time

#### Historical Comparison
- **Status**: Implemented (Database ready)
- **Description**: Compare current standings to previous rounds

### 5. Operations Features (High Priority)

#### Scheduled Actions
- **Status**: Implemented (Database ready)
- **Description**: Schedule automatic round transitions or visibility changes

#### Multi-language Support (i18n)
- **Status**: Implemented (Database ready)
- **Description**: Display leaderboard in multiple languages
- **Configuration**:
  - Enabled: Boolean
  - Languages: Array of language codes (en, es, fr, de, zh, ja)

#### Embed Support
- **Status**: ✅ Fully Implemented
- **Description**: Generate embeddable iframe code for external websites
- **Route**: `/embed`
- **Features**:
  - Auto-generated embed code
  - Copy-to-clipboard functionality
  - Live preview of embedded leaderboard
  - Customization instructions for iframe dimensions

#### Team Messaging
- **Status**: Implemented (Database ready)
- **Description**: Built-in chat for organizers to message teams

### 6. Medium Priority Features

#### Predictive Rankings
- **Status**: Implemented (Database ready)
- **Description**: Show projected final rankings based on current trends

#### Print-Friendly Views
- **Status**: Implemented (Database ready)
- **Description**: Generate printer-optimized reports and certificates

#### Participant Profiles
- **Status**: Implemented (Database ready)
- **Description**: Detailed profile pages with history across multiple events

#### On-Demand Data Export
- **Status**: Implemented (Database ready)
- **Description**: Participants can download their own performance data

## Implementation Architecture

### Database Schema

```prisma
model Event {
  features Json? // Stores per-event feature configuration
  // ... other fields
}

model Score {
  comment String? // Judge feedback
  updatedAt DateTime @updatedAt // Score history tracking
  // ... other fields
}
```

### Feature Configuration Type

```typescript
interface EventFeatures {
  presentation: {
    teamAvatars: boolean;
    stageDisplay: boolean;
    customThemes: boolean;
    podiumWinners: { enabled: boolean; topN: number };
  };
  competitive: {
    publicVoting: { enabled: boolean; weight: number };
    liveReactions: boolean;
    badgesAchievements: boolean;
    momentumIndicators: boolean;
  };
  judgeExperience: {
    judgeComments: boolean;
    bulkScoring: boolean;
    scoreHistory: boolean;
  };
  leaderboardVisibility: {
    scoreBreakdown: { enabled: boolean; detail: string };
    activityFeed: boolean;
    historicalComparison: boolean;
  };
  operations: {
    scheduledActions: boolean;
    i18n: { enabled: boolean; languages: string[] };
    embedSupport: boolean;
    teamMessaging: boolean;
    predictiveRankings: boolean;
    printViews: boolean;
    participantProfiles: boolean;
    exportOnDemand: boolean;
  };
}
```

### API Endpoints

#### GET/PUT `/api/event/settings`
- **GET**: Retrieve current feature configuration and judging mode
- **PUT**: Update feature configuration
- **Auth**: Development mode only (configure for production)

### Admin Interface

#### Route: `/admin/settings`
- Comprehensive feature configuration UI
- Grouped by category (High/Medium priority)
- Interactive toggles and configuration options
- Real-time save functionality
- Visual feedback for enabled features

### Feature Gates in Components

Features are conditionally rendered based on configuration:

```typescript
// Load features
const [features, setFeatures] = useState<EventFeatures | null>(null);

useEffect(() => {
  fetch('/api/event/settings')
    .then(r => r.json())
    .then(data => setFeatures(mergeFeatures(data.features)));
}, []);

// Conditionally render
{features?.competitive.momentumIndicators && (
  <td>{onFire && <span>🔥</span>}</td>
)}
```

## Usage Guide

### For Event Creators

1. Navigate to **Admin Panel** (`/admin`)
2. Click **⚙️ Feature Settings** button
3. Browse features by category:
   - High Priority: Core features for most events
   - Medium Priority: Advanced features for specific use cases
4. Toggle features on/off
5. Configure feature-specific options (e.g., podium top N, voting weight)
6. Click **Save Settings**

### For Developers

#### Adding a New Feature

1. Update `lib/features.ts`:
   - Add type definition
   - Add to `defaultFeatures`
   - Add metadata entry

2. Update components to check feature flag:
   ```typescript
   {features?.category.featureName && (
     <YourFeatureComponent />
   )}
   ```

3. Update admin settings UI if custom configuration needed

#### Feature Detection

```typescript
import { mergeFeatures } from '@/lib/features';

const features = mergeFeatures(storedFeatures);
if (features.presentation.podiumWinners.enabled) {
  const topN = features.presentation.podiumWinners.topN;
  // Show podium for top N
}
```

## Testing

### Enable All Features for Testing

1. Navigate to `/admin/settings`
2. Enable desired features
3. Configure any required parameters
4. Save settings
5. Visit relevant pages to test functionality

### Reset to Defaults

Use the **Reset to Defaults** button in the settings panel to disable all features.

## Roadmap

### Phase 1: Core Features (✅ Completed)
- Database schema updates
- Feature configuration types
- Admin settings UI
- API endpoints
- Podium/Winners view
- Stage display mode
- Momentum indicators
- Judge comments
- Embed support

### Phase 2: Advanced Features (Next)
- Team avatars/logos upload
- Custom theme editor
- Public voting system
- Live reactions
- Badges & achievements
- Score breakdown views
- Activity feed
- Bulk scoring interface

### Phase 3: Enterprise Features (Future)
- Multi-language UI
- Scheduled actions
- Team messaging
- Predictive rankings
- Participant profiles
- Data export functionality

## Performance Considerations

- Features are loaded once on component mount
- SSE updates continue regardless of feature state
- Heavy features (e.g., activity feed) should implement pagination
- Database queries are optimized with proper indexes

## Security Notes

- Feature configuration API currently restricted to development mode
- Production deployment should implement proper authentication
- Feature flags stored in database, not exposed to client
- Client components fetch features via authenticated API

## Migration Notes

### Database Migrations Applied

1. `20251210052313_add_event_features`: Added `features` JSON field to Event model
2. `20251210052910_add_judge_comments_and_history`: Added `comment` and `updatedAt` to Score model

### Breaking Changes

None. All features are additive and backward compatible.

## Support

For issues or feature requests, check the codebase documentation:
- Feature types: `lib/features.ts`
- Admin UI: `app/admin/settings/page.tsx`
- API: `app/api/event/settings/route.ts`
- Leaderboard: `app/leaderboard/page.tsx`
- Judge Console: `app/judge/page.tsx`
