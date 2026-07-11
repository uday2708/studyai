import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader, CheckCircle, XCircle, HelpCircle, ChevronRight, RotateCcw } from 'lucide-react'
import { materialsAPI, quizzesAPI } from '../api/endpoints'
import { toast } from '../components/Toast'

/* ── Quiz question component ─────────────────────────────────────────────── */
function QuizQuestion({ question, index, answer, onAnswer }) {
  if (question.type === 'mcq') {
    return (
      <div className="space-y-2">
        {(question.options || []).map((opt, i) => (
          <button key={i}
            onClick={() => onAnswer(question.id, opt)}
            className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-200 ${
              answer === opt
                ? 'border-primary-500/60 bg-primary-500/15 text-primary-200'
                : 'border-white/10 bg-white/3 text-slate-300 hover:border-primary-500/40 hover:bg-primary-500/8'
            }`}
            id={`q${index}-opt-${i}`}
          >
            <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
          </button>
        ))}
      </div>
    )
  }

  if (question.type === 'tf') {
    return (
      <div className="flex gap-3">
        {['True', 'False'].map((opt) => (
          <button key={opt} onClick={() => onAnswer(question.id, opt)}
            className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all duration-200 ${
              answer === opt
                ? 'border-primary-500/60 bg-primary-500/15 text-primary-200'
                : 'border-white/10 bg-white/3 text-slate-300 hover:border-primary-500/40'
            }`}
            id={`q${index}-${opt.toLowerCase()}`}>
            {opt}
          </button>
        ))}
      </div>
    )
  }

  // Short answer
  return (
    <textarea rows={2} placeholder="Type your answer…"
      value={answer || ''}
      onChange={(e) => onAnswer(question.id, e.target.value)}
      className="input-field resize-none"
      id={`q${index}-short`}
    />
  )
}

/* ── Results display ─────────────────────────────────────────────────────── */
function Results({ results, onReset }) {
  const pct = ((results.score / results.max_score) * 100).toFixed(0)
  const color = pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400'

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* Score header */}
      <div className="glass-card p-8 text-center mb-6">
        <div className={`text-6xl font-black ${color} mb-2`}>{pct}%</div>
        <p className="text-slate-300 font-semibold text-lg">{results.score} / {results.max_score} correct</p>
        {results.weak_topics?.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-slate-400 font-semibold mb-2 uppercase tracking-wide">Topics to Review</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {results.weak_topics.map((t) => <span key={t} className="badge-red">{t}</span>)}
            </div>
          </div>
        )}
        <button onClick={onReset} id="quiz-reset-btn" className="btn-primary mt-6 gap-2">
          <RotateCcw size={16} /> New Quiz
        </button>
      </div>

      {/* Per-question feedback */}
      <div className="space-y-3">
        {results.results?.map((r, i) => (
          <div key={r.question_id} className={`glass-card p-4 border ${r.correct ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
            <div className="flex items-start gap-3">
              {r.correct
                ? <CheckCircle size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                : <XCircle    size={18} className="text-red-400 flex-shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 mb-1">Question {i + 1}</p>
                {r.user_answer && (
                  <p className="text-sm text-slate-300 mb-1">
                    Your answer: <span className="font-medium text-white">{r.user_answer}</span>
                  </p>
                )}
                {!r.correct && (
                  <p className="text-sm text-emerald-300 mb-1">
                    Correct: <span className="font-medium">{r.correct_answer}</span>
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{r.feedback}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* ── Main Quizzes Page ───────────────────────────────────────────────────── */
export default function Quizzes() {
  const [materials, setMaterials]   = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [quizType, setQuizType]     = useState('mixed')
  const [count, setCount]           = useState(5)
  const [quiz, setQuiz]             = useState(null)
  const [answers, setAnswers]       = useState({})
  const [results, setResults]       = useState(null)
  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    materialsAPI.getAll().then(({ data }) => {
      const ready = (data.data || []).filter((m) => m.status === 'completed')
      setMaterials(ready)
      if (ready.length) setSelectedId(ready[0].id)
    }).finally(() => setLoading(false))
  }, [])

  const generate = async () => {
    setGenerating(true); setQuiz(null); setAnswers({}); setResults(null)
    try {
      const { data } = await quizzesAPI.generate({ material_id: selectedId, quiz_type: quizType, count })
      setQuiz(data.data)
      toast('Quiz ready!', 'success')
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to generate quiz.', 'error')
    } finally { setGenerating(false) }
  }

  const handleAnswer = (qId, value) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }))
  }

  const submit = async () => {
    const missing = quiz.questions.filter((q) => !answers[q.id])
    if (missing.length) { toast(`Please answer all ${missing.length} remaining questions.`, 'warning'); return }
    setSubmitting(true)
    try {
      const { data } = await quizzesAPI.submit(quiz.id, { answers })
      setResults(data.data)
    } catch (err) {
      toast(err.response?.data?.message || 'Submission failed.', 'error')
    } finally { setSubmitting(false) }
  }

  const reset = () => { setQuiz(null); setAnswers({}); setResults(null) }

  const answered = Object.keys(answers).length
  const total = quiz?.questions?.length || 0

  return (
    <div className="page-container">
      <h1 className="section-title">AI Quizzes</h1>
      <p className="section-subtitle">Test your knowledge with AI-generated adaptive quizzes.</p>

      {/* Config Panel */}
      {!quiz && !results && (
        <div className="glass-card p-5 mb-6 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Material</label>
            {loading ? <div className="skeleton h-11 rounded-xl" /> : (
              <select id="quiz-material-select" value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)} className="input-field">
                {materials.length === 0
                  ? <option>No completed materials yet</option>
                  : materials.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)
                }
              </select>
            )}
          </div>
          <div className="min-w-36">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Type</label>
            <select id="quiz-type-select" value={quizType} onChange={(e) => setQuizType(e.target.value)} className="input-field">
              <option value="mixed">Mixed</option>
              <option value="mcq">MCQ Only</option>
              <option value="tf">True / False</option>
              <option value="short">Short Answer</option>
            </select>
          </div>
          <div className="min-w-24">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Questions</label>
            <input type="number" min={3} max={20} value={count}
              onChange={(e) => setCount(Number(e.target.value))} className="input-field" id="quiz-count" />
          </div>
          <button id="generate-quiz-btn" onClick={generate}
            disabled={generating || !selectedId || materials.length === 0} className="btn-primary gap-2">
            {generating ? <><Loader size={16} className="animate-spin" /> Generating…</>
                        : <><Sparkles size={16} /> Generate Quiz</>}
          </button>
        </div>
      )}

      {/* Generating */}
      {generating && (
        <div className="glass-card p-12 text-center">
          <Loader size={32} className="text-primary-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300 font-medium">Generating your quiz…</p>
        </div>
      )}

      {/* Results */}
      {results && <Results results={results} onReset={reset} />}

      {/* Active Quiz */}
      {quiz && !results && !generating && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Progress */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-400">{answered}/{total} answered</p>
            <button onClick={reset} className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
              <RotateCcw size={11} /> New Quiz
            </button>
          </div>
          <div className="progress-bar mb-6">
            <div className="progress-bar-fill" style={{ width: `${total ? (answered / total) * 100 : 0}%` }} />
          </div>

          <div className="space-y-5">
            {quiz.questions.map((q, i) => (
              <motion.div key={q.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }} className="glass-card p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-primary-600/20 border border-primary-500/30 flex items-center justify-center flex-shrink-0">
                    <HelpCircle size={14} className="text-primary-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Q{i + 1} · {q.type?.toUpperCase()} · {q.topic}</p>
                    <p className="text-sm text-slate-200 font-medium">{q.question}</p>
                  </div>
                </div>
                <QuizQuestion question={q} index={i} answer={answers[q.id]} onAnswer={handleAnswer} />
              </motion.div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button id="submit-quiz-btn" onClick={submit} disabled={submitting}
              className="btn-primary gap-2 px-8">
              {submitting ? <><Loader size={16} className="animate-spin" /> Grading…</>
                          : <>Submit Quiz <ChevronRight size={16} /></>}
            </button>
          </div>
        </motion.div>
      )}

      {!generating && !quiz && !results && materials.length === 0 && !loading && (
        <div className="glass-card p-12 text-center">
          <HelpCircle size={36} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No materials available</p>
          <p className="text-slate-500 text-sm mt-1">Upload a study material first, then generate a quiz.</p>
        </div>
      )}
    </div>
  )
}
