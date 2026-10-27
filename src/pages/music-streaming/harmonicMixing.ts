import type { AudioTrack } from './types'

/**
 * Genre grouping map for smart harmonic / stylistic transition.
 * When mixing, songs within the same family blend much more naturally.
 */
const GENRE_CLUSTERS: string[][] = [
  ['rock', 'alternative', 'indie', 'hard rock', 'grunge', 'punk', 'alternative rock', 'post-grunge', 'nu metal'],
  ['metal', 'heavy metal', 'nu metal', 'thrash', 'death metal', 'metalcore', 'hard rock'],
  ['pop', 'synthpop', 'dance-pop', 'electropop', 'indie pop', 'chart'],
  ['electronic', 'edm', 'synthwave', 'techno', 'house', 'trance', 'ambient', 'dance', 'club', 'dnb', 'drum and bass', 'dubstep'],
  ['hip hop', 'hip-hop', 'rap', 'trap', 'r&b', 'urban'],
  ['r&b', 'soul', 'funk', 'neo-soul', 'groove'],
  ['classical', 'instrumental', 'soundtrack', 'orchestral', 'score', 'cinematic', 'ambient', 'piano'],
  ['jazz', 'blues', 'soul', 'swing', 'bossa nova'],
  ['acoustic', 'folk', 'country', 'singer-songwriter', 'unplugged'],
]

/**
 * Normalizes genre strings for fuzzy comparison.
 */
function cleanGenre(genre?: string): string {
  if (!genre) return ''
  return genre.toLowerCase().trim().replace(/[-_/]/g, ' ')
}

/**
 * Calculates a stylistic compatibility score between two tracks (0 to 100).
 */
export function calculateTrackCompatibility(trackA: AudioTrack, trackB: AudioTrack): number {
  if (trackA.id === trackB.id) return -1 // Do not pick the same track

  let score = 30 // Base score

  const genreA = cleanGenre(trackA.genre)
  const genreB = cleanGenre(trackB.genre)

  // 1. Genre exact match
  if (genreA && genreB) {
    if (genreA === genreB) {
      score += 40
    } else {
      // Check cluster compatibility
      let inSameCluster = false
      for (const cluster of GENRE_CLUSTERS) {
        const hasA = cluster.some((g) => genreA.includes(g) || g.includes(genreA))
        const hasB = cluster.some((g) => genreB.includes(g) || g.includes(genreB))
        if (hasA && hasB) {
          inSameCluster = true
          score += 25
          break
        }
      }
      if (!inSameCluster) {
        // If genres are known and completely different, reduce score slightly
        score -= 10
      }
    }
  }

  // 2. Artist match or collaboration
  const artistA = (trackA.artist || '').toLowerCase()
  const artistB = (trackB.artist || '').toLowerCase()
  if (artistA && artistB) {
    if (artistA === artistB) {
      score += 20
    } else if (artistA.includes(artistB) || artistB.includes(artistA)) {
      score += 15
    }
  }

  // 3. Era / Year proximity (similar production, loudness and sonic profile)
  const yearA = trackA.year
  const yearB = trackB.year
  if (yearA && yearB && yearA > 1900 && yearB > 1900) {
    const yearDiff = Math.abs(yearA - yearB)
    if (yearDiff <= 3) {
      score += 15
    } else if (yearDiff <= 8) {
      score += 10
    } else if (yearDiff <= 15) {
      score += 5
    }
  }

  // 4. Prefer tracks that are at least 30 seconds (so crossfade has room to breathe)
  const durB = trackB.durationSeconds || 0
  if (durB > 45) {
    score += 5
  }

  return score
}

/**
 * Selects the best harmonic/stylistic candidate from a list of tracks.
 * Returns the index of the chosen track in the candidate array.
 */
export function pickHarmonicCandidate(
  currentTrack: AudioTrack,
  candidates: { track: AudioTrack; originalIndex: number }[]
): number | null {
  if (candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0].originalIndex

  // Score all candidates
  const scored = candidates.map((item) => ({
    originalIndex: item.originalIndex,
    score: calculateTrackCompatibility(currentTrack, item.track),
  }))

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score)

  // Pick randomly from top 3 candidates to avoid deterministic repetition
  const topCount = Math.min(3, scored.length)
  const chosen = scored[Math.floor(Math.random() * topCount)]
  return chosen ? chosen.originalIndex : candidates[0].originalIndex
}
