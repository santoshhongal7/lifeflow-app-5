import { useState } from 'react'
import { useGoalStore } from '@/app/store/goalStore'
import { useCheckInStore } from '@/app/store/checkInStore'
import { useAuthStore } from '@/app/store/authStore'
import { getActiveGoals } from '@/shared/utils/goalUtils'
import { getTodayKey } from '@/shared/utils/dateUtils'
import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, Plus, Clock } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuthStore()
  const { goals } = useGoalStore()
  const { checkIns, submitDailyCheckIn } = useCheckInStore()
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const activeGoals = getActiveGoals(goals)
  const today = getTodayKey()

  const handleQuickCheckIn = async (goalId: string) => {
    if (!user) return

    setSubmitting(true)
    try {
      const goal = goals.find((g) => g.id === goalId)
      if (!goal) return

      // Create check-in with all sub-goals marked as done
      await submitDailyCheckIn(
        user.uid,
        goalId,
        today,
        goal.subGoals.map((sg) => ({
          subGoalId: sg.id,
          status: 'done',
        })),
        true,
        100
      )

      // Reset expanded view
      setExpandedGoal(null)
    } catch (error) {
      console.error('Error submitting check-in:', error)
      alert('Failed to log activity')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {activeGoals.length} active goal{activeGoals.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 flex gap-2">
        <Link
          to="/checkin"
          className="glass-button flex items-center gap-2 text-sm"
          style={{
            background: 'rgba(99, 102, 241, 0.2)',
            color: '#6366f1',
            border: '1px solid rgba(99, 102, 241, 0.3)',
          }}
        >
          <Clock size={16} />
          Log Past Activity
        </Link>
      </div>

      {/* Empty State */}
      {activeGoals.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            No active goals
          </h2>
          <p style={{ color: 'var(--text-secondary)' }} className="mb-4">
            Create your first goal to get started!
          </p>
          <Link to="/goals/create" className="gradient-button inline-block">
            Create Goal
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {activeGoals.map((goal) => {
            const todayCheckIns = checkIns.filter((ci) => ci.goalId === goal.id && ci.date === today)
            const isCheckedIn = todayCheckIns.length > 0 && todayCheckIns[0].isGoalDayComplete
            const isExpanded = expandedGoal === goal.id

            return (
              <div key={goal.id} className="glass-card p-4">
                {/* Goal Header */}
                <div className="flex items-start justify-between mb-3">
                  <Link
                    to={`/goals/${goal.id}`}
                    className="flex-1 hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{goal.emoji}</span>
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                          {goal.title}
                        </h3>
                        <p style={{ color: 'var(--text-secondary)' }} className="text-sm">
                          {goal.subGoals.length} sub-goals
                        </p>
                      </div>
                    </div>
                  </Link>

                  {/* Status Badge */}
                  {isCheckedIn ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={24} color="#22c55e" />
                      <span style={{ color: '#22c55e' }} className="text-sm font-semibold">
                        Completed
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Circle size={24} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ color: 'var(--text-muted)' }} className="text-sm font-semibold">
                        Pending
                      </span>
                    </div>
                  )}
                </div>

                {/* Sub-Goals List */}
                {isExpanded && (
                  <div className="mb-4 space-y-2 p-3 rounded-btn" style={{ background: 'var(--bg-secondary)' }}>
                    <p style={{ color: 'var(--text-secondary)' }} className="text-sm font-semibold mb-2">
                      Daily Sub-Goals:
                    </p>
                    {goal.subGoals.map((sg) => (
                      <div key={sg.id} className="flex items-center gap-2 text-sm">
                        <span className="text-lg">{sg.icon}</span>
                        <span style={{ color: 'var(--text-primary)' }}>{sg.title}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {!isCheckedIn && (
                    <>
                      <button
                        onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
                        className="flex-1 glass-button text-sm"
                      >
                        {isExpanded ? 'Hide Details' : 'View Details'}
                      </button>
                      <button
                        onClick={() => handleQuickCheckIn(goal.id)}
                        disabled={submitting}
                        className="flex-1 gradient-button text-sm flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={16} />
                        {submitting ? 'Logging...' : 'Log Activity'}
                      </button>
                    </>
                  )}

                  <Link
                    to={`/checkin/${goal.id}`}
                    className="flex-1 glass-button text-center text-sm"
                    style={{
                      background: 'rgba(79, 172, 254, 0.2)',
                      color: '#4facfe',
                      border: '1px solid rgba(79, 172, 254, 0.3)',
                    }}
                  >
                    Detailed Check-In
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Summary */}
      {activeGoals.length > 0 && (
        <div className="glass-card p-4 mt-6">
          <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Today's Summary
          </h3>
          <div className="text-sm space-y-1">
            <p style={{ color: 'var(--text-secondary)' }}>
              Active Goals:{' '}
              <span style={{ color: 'var(--text-primary)' }} className="font-semibold">
                {activeGoals.length}
              </span>
            </p>
            <p style={{ color: 'var(--text-secondary)' }}>
              Completed:{' '}
              <span style={{ color: '#22c55e' }} className="font-semibold">
                {checkIns.filter((ci) => ci.date === today && ci.isGoalDayComplete).length}
              </span>
            </p>
            <p style={{ color: 'var(--text-secondary)' }}>
              Pending:{' '}
              <span style={{ color: '#f59e0b' }} className="font-semibold">
                {activeGoals.length - checkIns.filter((ci) => ci.date === today && ci.isGoalDayComplete).length}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
