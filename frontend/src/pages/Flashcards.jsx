import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader, CreditCard, CheckCircle, RotateCcw, Shuffle, ChevronLeft, ChevronRight } from 'lucide-react'
import { materialsAPI, flashcardsAPI } from '../api/endpoints'
import { toast } from '../components/Toast'

function FlipCard({ card, index, total, onToggleKnown }) {
  const [flipped, setFlipped] = useState(false)

  const diffColor = { Easy: 'badge-green', Medium: 'badge-yellow', Hard: 'badge-red' }

  return (
    <div className="flex flex-col items-center">
      {/* Progress */}
      <div className="text-xs text-slate-500 mb-4 font-medium">{index + 1} / {total}</div>

      {/* 3D Flip Card */}
      <div
        className="relative w-full max-w-xl h-64 cursor-pointer select-none"
        style={{ perspective: '1000px' }}
        onClick={() => setFlipped((f) => !f)}
        id={`flashcard-${index}`}
      >
        <motion.div
          className="relative w-full h-full"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 150, damping: 20 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front */}
          <div className="absolute inset-0 glass-card p-6 flex flex-col items-center justify-center text-center"
            style={{ backfaceVisibility: 'hidden' }}>
            <div className="flex gap-2 mb-4">
              <span className={`badge ${diffColor[card.difficulty] || 'badge-primary'}`}>{card.difficulty}</span>
              <span className="badge-primary">{card.topic}</span>
            </div>
            <p className="text-slate-200 text-lg font-semibold leading-snug">{card.question}</p>
            <p className="text-xs text-slate-500 mt-4">Click to reveal answer</p>
          </div>

          {/* Back */}
          <div className="absolute inset-0 glass-card p-6 flex flex-col items-center justify-center text-center"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <p className="text-primary-300 text-base font-medium leading-relaxed">{card.answer}</p>
          </div>
        </motion.div>
      </div>

      {/* Mark known */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={(e) => {
          e.stopPropagation()
          onToggleKnown(index)
        }}
        id={`mark-known-btn-${index}`}
        className={`mt-5 flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold border transition-all duration-200 ${
          card.known
            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
            : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
        }`}
      >
        <CheckCircle size={15} />
        {card.known ? 'Marked as Known ✓' : 'Mark as Known'}
      </motion.button>
    </div>
  )
}

export default function Flashcards() {
  const [materials, setMaterials]   = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [flashcardSet, setFlashcardSet] = useState(null)
  const [cards, setCards]           = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    materialsAPI.getAll().then(({ data }) => {
      const ready = (data.data || []).filter((m) => m.status === 'completed')
      setMaterials(ready)
      if (ready.length) setSelectedId(ready[0].id)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setCards([]); setCurrentIdx(0); setFlashcardSet(null)
    flashcardsAPI.getByMaterial(selectedId)
      .then(({ data }) => {
        setFlashcardSet(data.data)
        setCards(data.data?.cards || [])
      })
      .catch(() => { /* none yet */ })
  }, [selectedId])

  const generate = async () => {
    setGenerating(true)
    try {
      const { data } = await flashcardsAPI.generate({ material_id: selectedId })
      setFlashcardSet(data.data)
      setCards(data.data?.cards || [])
      setCurrentIdx(0)
      toast('Flashcards generated!', 'success')
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to generate flashcards.', 'error')
    } finally { setGenerating(false) }
  }

  const handleToggleKnown = async (cardIdx) => {
    if (!flashcardSet) return
    const card = cards[cardIdx]
    const nextKnown = !card.known

    // Optimistically update parent state
    const updatedCards = [...cards]
    updatedCards[cardIdx] = { ...card, known: nextKnown }
    setCards(updatedCards)

    try {
      await flashcardsAPI.markKnown(flashcardSet.id, {
        card_index: cardIdx,
        known: nextKnown
      })
      toast(nextKnown ? 'Card marked as known!' : 'Card marked as unknown!', 'success')
    } catch (err) {
      // Revert if API fails
      const revertedCards = [...cards]
      revertedCards[cardIdx] = { ...card, known: card.known }
      setCards(revertedCards)
      toast(err.response?.data?.message || 'Failed to update card status.', 'error')
    }
  }

  const shuffle = () => {
    setCards((prev) => [...prev].sort(() => Math.random() - 0.5))
    setCurrentIdx(0)
    toast('Cards shuffled!', 'info')
  }

  const prev = () => setCurrentIdx((i) => Math.max(0, i - 1))
  const next = () => setCurrentIdx((i) => Math.min(cards.length - 1, i + 1))

  return (
    <div className="page-container">
      <h1 className="section-title">Flashcards</h1>
      <p className="section-subtitle">Study with AI-generated flashcards. Click a card to flip it.</p>

      {/* Controls */}
      <div className="glass-card p-5 mb-6 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Material</label>
          {loading ? <div className="skeleton h-11 rounded-xl" /> : (
            <select id="flashcard-material-select" value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)} className="input-field">
              {materials.length === 0
                ? <option>No completed materials yet</option>
                : materials.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)
              }
            </select>
          )}
        </div>
        <button id="generate-flashcards-btn" onClick={generate}
          disabled={generating || !selectedId || materials.length === 0} className="btn-primary gap-2">
          {generating ? <><Loader size={16} className="animate-spin" /> Generating…</>
                      : <><Sparkles size={16} /> Generate Cards</>}
        </button>
        {cards.length > 1 && (
          <button id="shuffle-btn" onClick={shuffle} className="btn-secondary gap-2">
            <Shuffle size={16} /> Shuffle
          </button>
        )}
      </div>

      {/* Card Viewer */}
      <AnimatePresence mode="wait">
        {generating && (
          <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="glass-card p-12 text-center">
            <Loader size={32} className="text-primary-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-300 font-medium">Generating flashcards…</p>
          </motion.div>
        )}

        {!generating && cards.length > 0 && (
          <motion.div key="cards" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <FlipCard
              key={currentIdx}
              card={cards[currentIdx]}
              index={currentIdx}
              total={cards.length}
              onToggleKnown={handleToggleKnown}
            />

            {/* Navigation */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <button onClick={prev} disabled={currentIdx === 0} id="prev-card-btn"
                className="btn-secondary p-2 disabled:opacity-30">
                <ChevronLeft size={18} />
              </button>
              <div className="progress-bar w-40">
                <div className="progress-bar-fill" style={{ width: `${((currentIdx + 1) / cards.length) * 100}%` }} />
              </div>
              <button onClick={next} disabled={currentIdx === cards.length - 1} id="next-card-btn"
                className="btn-secondary p-2 disabled:opacity-30">
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Reset */}
            <div className="text-center mt-4">
              <button onClick={() => setCurrentIdx(0)} id="reset-cards-btn"
                className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1.5 mx-auto transition-colors">
                <RotateCcw size={12} /> Restart
              </button>
            </div>
          </motion.div>
        )}

        {!generating && cards.length === 0 && (
          <motion.div key="empty" className="glass-card p-12 text-center">
            <CreditCard size={36} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No flashcards yet</p>
            <p className="text-slate-500 text-sm mt-1">Select a material and generate flashcards.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
