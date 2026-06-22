import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGoalStore } from '@/app/store/goalStore'
import { useCheckInStore } from '@/app/store/checkInStore'
import { useAuthStore } from '@/app/store/authStore'
import { getTodayKey, toDateKey, addDays } from '@/shared/utils/dateUtils'
import { CheckCircle2, Circle, ChevronLeft, Save, Calendar } from 'lucide-react'
import { CheckInStatus } from '@/shared/types'

export default function DailyCheckIn() {
  const { goalId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { goals, getGoalById } = useGoalStore()
  const { checkIns, submitDailyCheckIn } = useCheckInStore()

  const goal = goalId ? getGoalById(goalId) : null
  const [selectedGoalId, setSelectedGoalId] = useState(goalId || '')
  const [selectedDate, setSelectedDate] = useState(getTodayKey())
  const [entryStates, setEntryStates] = useState<{ [key: string]: CheckInStatus }>({})
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)

  const today = getTodayKey()
  const currentGoal = selectedGoalId ? getGoalById(selectedGoalId) : null
  const checkInForDate = checkIns.find((ci) => ci.goalId === selectedGoalId && ci.date === selectedDate)

  // Initialize entry states from existing check-in
  const initializeStates = () => {
    if (checkInForDate) {
      const states: { [key: string]: CheckInStatus } = {}
      checkInForDate.subGoalEntries.forEach((entry) => {
        states[entry.subGoalId] = entry.status
      })
      setEntryStates(states)
      setNotes(checkInForDate.notes || '')
    } else {
      setEntryStates({})
      setNotes('')
    }
  }

  if (!selectedGoalId) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 mb-4"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ChevronLeft size={20} />
          Back
        </button>

        <h1 className="text-3xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
          Daily Check-In
        </h1>

        {goals.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p style={{ color: 'var(--text-secondary)' }}>No goals available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  setSelectedGoalId(g.id)
                  initializeStates()
                }}
                className="glass-card p-4 text-left hover:scale-105 transition-transform w-full"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{g.emoji}</span>
                  <div>
                    <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                      {g.title}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)' }} className="text-sm">
                      {g.subGoals.length} sub-goals
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!currentGoal) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <button
          onClick={() => setSelectedGoalId('')}
          className="flex items-center gap-2 mb-4"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ChevronLeft size={20} />
          Back
        </button>
        <div className="glass-card p-8 text-center">
          <p style={{ color: 'var(--text-secondary)' }}>Goal not found</p>
        </div>
      </div>
    )
  }

  const handleToggleSubGoal = (subGoalId: string) => {
    setEntryStates((prev) => {
      const current = prev[subGoalId]
      return {
        ...prev,
        [subGoalId]: current === 'done' ? 'missed' : 'done',
      }
    })
  }

  const handleSubmit = async () => {
    if (!user) {
      setError('User not authenticated')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const subGoalEntries = currentGoal.subGoals.map((sg) => ({
        subGoalId: sg.id,
        status: (entryStates[sg.id] || 'pending') as CheckInStatus,
      }))

      const completedCount = subGoalEntries.filter((e) => e.status === 'done').length
      const completionPercentage = Math.round((completedCount / currentGoal.subGoals.length) * 100)
      const isComplete = completedCount === currentGoal.subGoals.length

      await submitDailyCheckIn(user.uid, selectedGoalId, selectedDate, subGoalEntries, isComplete, completionPercentage)

      setSelectedGoalId('')
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Failed to submit check-in')
    } finally {
      setSubmitting(false)
    }
  }

  const completedCount = Object.values(entryStates).filter((status) => status === 'done').length

  return (
    <div className="p-4 max-w-2xl mx-auto pb-20">
      {/* Header */}
      <button
        onClick={() => setSelectedGoalId('')}
        className="flex items-center gap-2 mb-4"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ChevronLeft size={20} />
        Back to Goals
      </button>

      {error && (
        <div
          className="p-4 rounded-btn mb-4 text-sm text-red-400"
          style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
        >
          {error}
        </div>
      )}

      {/* Goal Header */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{currentGoal.emoji}</span>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {currentGoal.title}
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {selectedDate === today ? "Today's Check-In" : `Check-In for ${new Date(selectedDate).toLocaleDateString()}`}
            </p>
          </div>
        </div>

        {/* Date Selector */}
        <div className="mb-4 p-3 rounded-btn" style={{ background: 'var(--bg-secondary)' }}>
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, -1))}
              className="glass-button px-3 py-2 text-sm"
            >
              ← Prev
            </button>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex-1 glass-button flex items-center justify-center gap-2 px-3 py-2"
            >
              <Calendar size={16} />
              {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </button>
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              disabled={selectedDate >= today}
              className="glass-button px-3 py-2 text-sm disabled:opacity-50"
            >
              Next →
            </button>
          </div>

          {/* Date Picker */}
          {showDatePicker && (
            <div className="mt-3">
              <input
                type="date"
                value={selectedDate}
                max={today}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  setShowDatePicker(false)
                  initializeStates()
                }}
                className="glass-input w-full"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <div className="flex-1 glass-card p-3 text-center">
            <p style={{ color: 'var(--text-muted)' }} className="text-xs mb-1">
              Completed
            </p>
            <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>
              {completedCount}/{currentGoal.subGoals.length}
            </p>
          </div>
          <div className="flex-1 glass-card p-3 text-center">
            <p style={{ color: 'var(--text-muted)' }} className="text-xs mb-1">
              Progress
            </p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {Math.round((completedCount / currentGoal.subGoals.length) * 100)}%
            </p>
          </div>
        </div>
      </div>

      {/* Sub-Goals */}
      <div className="glass-card p-6 mb-6">
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Mark your progress:
        </h2>

        <div className="space-y-2">
          {currentGoal.subGoals.map((sg) => {
            const status = entryStates[sg.id] || 'pending'
            const isDone = status === 'done'

            return (
              <button
                key={sg.id}
                onClick={() => handleToggleSubGoal(sg.id)}
                className="glass-card p-4 flex items-center gap-3 w-full transition-all hover:scale-105"
                style={{
                  background: isDone ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-card)',
                  borderColor: isDone ? 'rgba(34, 197, 94, 0.3)' : 'var(--glass-border)',
                }}
              >
                <div className="flex-shrink-0">
                  {isDone ? (
                    <CheckCircle2 size={24} color="#22c55e" />
                  ) : (
                    <Circle size={24} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p
                    className="font-semibold"
                    style={{ color: isDone ? '#22c55e' : 'var(--text-primary)' }}
                  >
                    {sg.title}
                  </p>
                </div>
                <span className="text-2xl">{sg.icon}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Notes */}
      <div className="glass-card p-6 mb-6">
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="glass-input"
          placeholder="How did you do today?"
          rows={3}
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="gradient-button w-full flex items-center justify-center gap-2"
      >
        <Save size={18} />
        {submitting ? 'Submitting...' : 'Submit Check-In'}
      </button>
    </div>
  )
}
