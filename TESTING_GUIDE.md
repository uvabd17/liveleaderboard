# Quick Start Guide - Feature Testing

## 🚀 Getting Started

The Live Leaderboard now has a complete per-event feature toggle system! All features are **disabled by default** for a clean experience.

## 📋 Testing Checklist

### 1. Access Admin Settings
```
Navigate to: http://localhost:3000/admin/settings
```
- You'll see all 22 toggleable features organized by priority
- Features are grouped into High Priority and Medium Priority sections

### 2. Enable Core Features (Recommended for Testing)

#### Presentation Features
- ✅ **Podium/Winners View** - Set to "Top 3", "Top 5", "Top 8", or "Top 10"
- ✅ **Stage Display Mode** - Optimized for projectors

#### Competitive Features
- ✅ **Momentum Indicators** - Shows 🔥 for teams on hot streaks

#### Judge Experience
- ✅ **Judge Comments/Feedback** - Allows judges to leave feedback

#### Operations
- ✅ **Embed Support** - Generate iframe embed codes

### 3. Test Each Feature

#### Test Podium View
1. Enable "Podium/Winners View" in settings
2. Choose "Top 5" (or any number)
3. Save settings
4. Navigate to `/leaderboard`
5. Click "🏆 Show Podium" button
6. See animated podium cards with gold/silver/bronze styling
7. Toggle back to full leaderboard view

#### Test Stage Display
1. Navigate to `/stage`
2. See large-format display optimized for projectors
3. Observe real-time updates with animated highlights
4. Notice rank movement indicators (↑/↓)
5. Top 3 get gold/silver/bronze borders and shadows

#### Test Momentum Indicators
1. Enable "Momentum Indicators" in settings
2. Navigate to `/leaderboard`
3. When a team improves rank 2+ times consecutively, see 🔥 emoji
4. Notice the pulse animation on the fire emoji

#### Test Judge Comments
1. Enable "Judge Comments/Feedback" in settings
2. Navigate to `/judge`
3. Select a participant
4. See textarea fields below each criterion
5. See "General Feedback" textarea at the bottom
6. Submit scores with comments
7. Comments are stored in database with scores

#### Test Embed Support
1. Navigate to `/embed`
2. See auto-generated iframe embed code
3. Click "Copy Code" button
4. Paste into your website/HTML file
5. See live preview of embedded leaderboard

### 4. Test Navigation Updates

New navigation links added:
- `/stage` - Stage display mode
- `/admin/settings` - Feature configuration
- `/embed` - Embed code generator

### 5. Verify Database Changes

Check Prisma Studio or database directly:
```bash
npx prisma studio
```

Look for:
- `Event.features` - JSON field with feature configuration
- `Score.comment` - Text field for judge feedback
- `Score.updatedAt` - Timestamp for score history

## 🎯 Feature Combinations to Test

### Scenario 1: Professional Event
Enable:
- Stage Display Mode
- Podium (Top 3)
- Judge Comments
- Embed Support

### Scenario 2: Competitive Hackathon
Enable:
- Momentum Indicators
- Podium (Top 10)
- Judge Comments
- Stage Display

### Scenario 3: Casual Event
Enable:
- Podium (Top 5)
- Embed Support

## 🐛 Troubleshooting

### Features Not Appearing?
1. Check `/admin/settings` - is the feature enabled?
2. Clear browser cache and refresh
3. Check browser console for errors
4. Verify database has `features` field populated

### Settings Not Saving?
1. Check browser console for API errors
2. Verify database connection
3. Ensure event exists in database
4. Check API route at `/api/event/settings`

### SSE Not Working?
1. Ensure development server is running
2. Check `/api/sse` endpoint is accessible
3. Refresh the page to reconnect

## 📊 Demo Data

Use the existing demo data workflow:
1. Visit `/admin` to generate QR codes
2. Visit `/register` to add participants
3. Visit `/judge` to submit scores
4. Watch real-time updates on `/leaderboard`, `/stage`, and embedded views

## 🎨 Visual Testing

### Podium View
- Gold gradient (#ffd700) for 1st place
- Silver gradient (#c0c0c0) for 2nd place
- Bronze gradient (#cd7f32) for 3rd place
- Blue gradient for other winners
- Animated rise effect on load
- Height decreases for lower ranks

### Stage Display
- 5rem heading with gradient
- Large 4rem scores
- 3.5rem rank numbers
- Animated highlights on rank changes
- Top 3 get gold borders and shadows

### Momentum Indicators
- 🔥 emoji appears in dedicated column
- Pulse animation (scale 1.0 → 1.2 → 1.0)
- Only shows after 2+ consecutive improvements

## 🔄 Reset and Cleanup

### Reset Features to Default
1. Navigate to `/admin/settings`
2. Click "Reset to Defaults" button
3. All features will be disabled

### Reseed Database
```bash
node scripts/seed-dev.mjs
```

This will reinitialize the event with default feature configuration (all disabled).

## 📝 Configuration Examples

### Minimal Setup
```json
{
  "presentation": {
    "podiumWinners": { "enabled": true, "topN": 3 }
  }
}
```

### Full Featured Setup
```json
{
  "presentation": {
    "teamAvatars": true,
    "stageDisplay": true,
    "customThemes": true,
    "podiumWinners": { "enabled": true, "topN": 10 }
  },
  "competitive": {
    "publicVoting": { "enabled": true, "weight": 25 },
    "liveReactions": true,
    "badgesAchievements": true,
    "momentumIndicators": true
  },
  "judgeExperience": {
    "judgeComments": true,
    "bulkScoring": true,
    "scoreHistory": true
  }
}
```

## 🎓 Next Steps

After testing these features:
1. Review `FEATURES.md` for complete documentation
2. Explore `lib/features.ts` to understand feature types
3. Check `app/admin/settings/page.tsx` for UI implementation
4. Review `app/leaderboard/page.tsx` for feature integration examples

Happy testing! 🚀

## 🧪 Automated Smoke Tests

You can run the built-in smoke test harness to validate key endpoints and basic performance expectations.

Windows (PowerShell):
```
$env:BASE_URL = 'http://localhost:3000'
node tests/smoke.test.mjs
```

macOS / Linux:
```
BASE_URL=http://localhost:3000 node tests/smoke.test.mjs
```

If your production server runs on a different port (e.g. `3001`), set `BASE_URL` accordingly.

The smoke test will exit with code `0` on success and `1` if any checks fail. Use this in CI or local verification before deploying.
