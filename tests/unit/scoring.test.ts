/**
 * Unit tests for scoring calculations
 */

describe('Scoring Calculations', () => {
  describe('Total Score Calculation', () => {
    const calculateTotalScore = (scores: { value: number; weight?: number }[]): number => {
      return scores.reduce((sum, score) => sum + score.value * (score.weight || 1), 0)
    }

    it('should sum scores without weights', () => {
      const scores = [
        { value: 80 },
        { value: 90 },
        { value: 70 }
      ]
      expect(calculateTotalScore(scores)).toBe(240)
    })

    it('should apply weights to scores', () => {
      const scores = [
        { value: 80, weight: 2 },
        { value: 90, weight: 1 },
        { value: 70, weight: 1.5 }
      ]
      // 80*2 + 90*1 + 70*1.5 = 160 + 90 + 105 = 355
      expect(calculateTotalScore(scores)).toBe(355)
    })

    it('should return 0 for empty scores', () => {
      expect(calculateTotalScore([])).toBe(0)
    })
  })

  describe('Leaderboard Ranking', () => {
    interface Participant {
      id: string
      name: string
      totalScore: number
    }

    const rankParticipants = (participants: Participant[]): (Participant & { rank: number })[] => {
      const sorted = [...participants].sort((a, b) => b.totalScore - a.totalScore)
      let rank = 1
      return sorted.map((p, index) => {
        // Handle ties - same score = same rank
        if (index > 0 && p.totalScore < sorted[index - 1].totalScore) {
          rank = index + 1
        }
        return { ...p, rank }
      })
    }

    it('should rank participants by total score descending', () => {
      const participants = [
        { id: '1', name: 'Team A', totalScore: 100 },
        { id: '2', name: 'Team B', totalScore: 150 },
        { id: '3', name: 'Team C', totalScore: 120 }
      ]
      const ranked = rankParticipants(participants)
      
      expect(ranked[0].name).toBe('Team B')
      expect(ranked[0].rank).toBe(1)
      expect(ranked[1].name).toBe('Team C')
      expect(ranked[1].rank).toBe(2)
      expect(ranked[2].name).toBe('Team A')
      expect(ranked[2].rank).toBe(3)
    })

    it('should handle ties with same rank', () => {
      const participants = [
        { id: '1', name: 'Team A', totalScore: 100 },
        { id: '2', name: 'Team B', totalScore: 100 },
        { id: '3', name: 'Team C', totalScore: 90 }
      ]
      const ranked = rankParticipants(participants)
      
      expect(ranked[0].rank).toBe(1)
      expect(ranked[1].rank).toBe(1) // Tie
      expect(ranked[2].rank).toBe(3) // Skip to 3
    })
  })

  describe('Score Validation', () => {
    const validateScore = (value: number, max: number): { valid: boolean; error?: string } => {
      if (typeof value !== 'number' || isNaN(value)) {
        return { valid: false, error: 'Score must be a number' }
      }
      if (value < 0) {
        return { valid: false, error: 'Score cannot be negative' }
      }
      if (value > max) {
        return { valid: false, error: `Score cannot exceed ${max}` }
      }
      return { valid: true }
    }

    it('should accept valid scores', () => {
      expect(validateScore(50, 100).valid).toBe(true)
      expect(validateScore(0, 100).valid).toBe(true)
      expect(validateScore(100, 100).valid).toBe(true)
    })

    it('should reject negative scores', () => {
      const result = validateScore(-10, 100)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('negative')
    })

    it('should reject scores exceeding maximum', () => {
      const result = validateScore(150, 100)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceed')
    })

    it('should reject non-numeric values', () => {
      const result = validateScore(NaN, 100)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('number')
    })
  })
})
