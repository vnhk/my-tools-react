type QueueTask = {
  id: string
  run: () => void
  cancel: () => void
}

class ThumbnailQueue {
  private maxConcurrent = 6
  private activeCount = 0
  private queue: QueueTask[] = []

  /**
   * Enqueue a request to load a thumbnail.
   * Returns a cancel function.
   */
  enqueue(id: string, run: () => void): () => void {
    let cancelled = false

    const task: QueueTask = {
      id,
      run: () => {
        if (!cancelled) {
          run()
        }
      },
      cancel: () => {
        cancelled = true
        this.queue = this.queue.filter((t) => t !== task)
      },
    }

    this.queue.push(task)
    this.processNext()

    return () => task.cancel()
  }

  /**
   * Releases an active concurrency slot and triggers the next item in queue.
   */
  release() {
    this.activeCount = Math.max(0, this.activeCount - 1)
    this.processNext()
  }

  private processNext() {
    if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
      return
    }

    const next = this.queue.shift()
    if (next) {
      this.activeCount++
      next.run()
    }
  }
}

export const thumbnailQueue = new ThumbnailQueue()
