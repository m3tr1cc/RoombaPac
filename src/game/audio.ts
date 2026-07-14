export type Sound = 'dot' | 'item' | 'pet' | 'bump' | 'hit' | 'clear' | 'reset' | 'turn'

export class ArcadeAudio {
  private context: AudioContext | null = null
  private musicTimer = 0
  private muted = localStorage.getItem('roombapac-muted') === 'true'
  private step = 0

  get isMuted() { return this.muted }

  async start() {
    this.context ??= new AudioContext()
    if (this.context.state === 'suspended') await this.context.resume()
    if (!this.musicTimer && !this.muted) this.scheduleMusic()
  }

  setMuted(value: boolean) {
    this.muted = value
    localStorage.setItem('roombapac-muted', String(value))
    if (value) { window.clearInterval(this.musicTimer); this.musicTimer = 0 }
    else void this.start()
  }

  suspend() { void this.context?.suspend() }
  resume() { if (!this.muted) void this.start() }

  play(sound: Sound) {
    if (!this.context || this.muted) return
    const recipes: Record<Sound, [number, number, OscillatorType]> = {
      dot: [720, 0.045, 'square'], item: [420, 0.3, 'triangle'], pet: [180, 0.35, 'sawtooth'],
      bump: [95, 0.08, 'square'], hit: [130, 0.55, 'sawtooth'], clear: [523, 0.5, 'square'],
      reset: [160, 0.18, 'triangle'], turn: [240, 0.025, 'triangle'],
    }
    const [frequency, duration, type] = recipes[sound]
    this.tone(frequency, duration, type, sound === 'dot' ? 0.025 : 0.06)
    if (sound === 'item' || sound === 'clear') window.setTimeout(() => this.tone(frequency * 1.5, duration * 0.7, 'square', 0.05), 90)
  }

  private scheduleMusic() {
    const notes = [196, 247, 294, 392, 330, 294, 247, 220, 196, 247, 330, 294, 247, 220, 165, 185]
    this.musicTimer = window.setInterval(() => {
      if (!this.muted && this.context?.state === 'running') {
        this.tone(notes[this.step % notes.length], 0.11, this.step % 4 ? 'square' : 'triangle', 0.018)
        this.step += 1
      }
    }, 150)
  }

  private tone(frequency: number, duration: number, type: OscillatorType, volume: number) {
    if (!this.context) return
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, this.context.currentTime)
    gain.gain.setValueAtTime(volume, this.context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration)
    oscillator.connect(gain).connect(this.context.destination)
    oscillator.start()
    oscillator.stop(this.context.currentTime + duration)
  }
}
