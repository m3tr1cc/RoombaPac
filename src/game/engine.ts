import { availableDirections, createMaze, isWalkable, mulberry32 } from './maze'
import { calculateScore, frightenedDuration, petSpeed, roombaSpeed } from './scoring'
import { DIRS, OPPOSITE, pointKey, type Actor, type Direction, type FurnitureKind, type FurniturePiece, type GameMode, type GameSnapshot, type Maze, type Pet, type Point } from './types'

type EngineOptions = { onSnapshot: (snapshot: GameSnapshot) => void; onSound: (sound: 'dot' | 'item' | 'pet' | 'bump' | 'hit' | 'clear' | 'reset' | 'turn') => void }

const PET_COLORS = ['#ed9a38', '#22202b', '#c7b9aa', '#d9a453', '#a86539']
const FLOOR_RECTS = [
  [24, 1095, 116, 115], [165, 1095, 116, 115], [306, 1095, 116, 115], [445, 1095, 116, 115],
  [579, 1095, 110, 115], [710, 1095, 115, 115], [841, 1095, 105, 115], [966, 1095, 109, 115], [1091, 1095, 129, 115],
] as const
type AtlasRect = readonly [number, number, number, number]
type DirectionFrames = Record<Direction, readonly [AtlasRect, AtlasRect]>

const ROOMBA_FRAMES: readonly AtlasRect[] = [
  [25, 25, 88, 92], [130, 25, 88, 92], [235, 25, 88, 92], [340, 25, 88, 92],
]
const PET_FRAMES: readonly DirectionFrames[] = [
  {
    down: [[479, 31, 78, 101], [678, 143, 82, 101]], up: [[479, 143, 78, 101], [479, 250, 78, 101]],
    right: [[579, 31, 84, 101], [678, 31, 84, 101]], left: [[579, 31, 84, 101], [678, 31, 84, 101]],
  },
  {
    down: [[804, 28, 81, 105], [1110, 142, 82, 105]], up: [[804, 142, 81, 105], [804, 252, 81, 105]],
    right: [[1005, 28, 88, 105], [1110, 28, 88, 105]], left: [[1005, 28, 88, 105], [1110, 28, 88, 105]],
  },
  {
    down: [[31, 368, 82, 104], [331, 368, 82, 104]], up: [[31, 484, 82, 104], [331, 484, 82, 104]],
    right: [[132, 368, 82, 104], [233, 368, 82, 104]], left: [[132, 368, 82, 104], [233, 368, 82, 104]],
  },
  {
    down: [[481, 370, 83, 104], [678, 486, 83, 94]], up: [[481, 486, 83, 94], [481, 486, 83, 94]],
    right: [[580, 370, 83, 104], [678, 370, 83, 104]], left: [[580, 370, 83, 104], [678, 370, 83, 104]],
  },
  {
    down: [[817, 369, 88, 104], [1118, 369, 88, 104]], up: [[817, 484, 88, 104], [1118, 484, 88, 104]],
    right: [[917, 369, 88, 104], [1018, 369, 88, 104]], left: [[917, 369, 88, 104], [1018, 369, 88, 104]],
  },
]
const FURNITURE_RECTS: Record<FurnitureKind, AtlasRect> = {
  i: [20, 815, 150, 87], l: [210, 817, 116, 90], t: [499, 816, 111, 91], pen: [970, 811, 250, 258],
}
const BORDER_RECT: AtlasRect = [20, 815, 150, 87]
const ITEM_RECTS = Array.from({ length: 16 }, (_, index) => [28 + index * 75, 621, 58, 64] as const)

function actorPoint(actor: Actor): Point {
  const delta = DIRS[actor.direction]
  return { x: actor.x + delta.x * actor.progress, y: actor.y + delta.y * actor.progress }
}

export class GameEngine {
  maze: Maze = createMaze(1)
  roomba: Actor = { ...this.maze.spawn, direction: 'right', nextDirection: 'right', progress: 0 }
  pets: Pet[] = []
  mode: GameMode = 'idle'
  score = 0
  level = 1
  lives = 3
  dots = 0
  items = 0
  petsEaten = 0
  activeMs = 0
  frightenedUntil = 0
  private seed = 1
  private transitionUntil = 0
  private graceUntil = 0
  private random = mulberry32(1)
  private lastBump = 0
  private nextPetRelease = 0
  private nextPetReleaseAt = 0
  private atlas = new Image()
  private options: EngineOptions

  constructor(options: EngineOptions) {
    this.options = options
    this.atlas.src = '/assets/game/roombapac-atlas.png'
    this.resetActors()
  }

  snapshot(): GameSnapshot {
    return { mode: this.mode, score: this.score, level: this.level, lives: this.lives, dots: this.dots, items: this.items, pets: this.petsEaten, activeMs: this.activeMs }
  }

  start(seed: number) {
    this.seed = seed >>> 0
    this.random = mulberry32(this.seed)
    this.score = 0; this.level = 1; this.lives = 3; this.dots = 0; this.items = 0; this.petsEaten = 0; this.activeMs = 0
    this.maze = createMaze(this.seed, 1)
    this.mode = 'playing'
    this.graceUntil = performance.now() + 1500
    this.resetActors()
    this.emit()
  }

  reset() {
    this.mode = 'idle'
    this.score = 0; this.level = 1; this.lives = 3; this.dots = 0; this.items = 0; this.petsEaten = 0; this.activeMs = 0
    this.maze = createMaze(this.seed || 1, 1)
    this.resetActors()
    this.options.onSound('reset')
    this.emit()
  }

  setDirection(direction: Direction) {
    if (this.mode === 'playing') this.roomba.nextDirection = direction
  }

  togglePause() {
    if (this.mode === 'playing') this.mode = 'paused'
    else if (this.mode === 'paused') this.mode = 'playing'
    this.emit()
  }

  pause() { if (this.mode === 'playing') { this.mode = 'paused'; this.emit() } }

  update(dt: number, now: number) {
    if (this.mode === 'life-lost' && now >= this.transitionUntil) {
      if (this.lives <= 0) this.mode = 'game-over'
      else { this.resetActors(); this.mode = 'playing'; this.graceUntil = now + 2000 }
      this.emit()
      return
    }
    if (this.mode === 'level-clear' && now >= this.transitionUntil) {
      this.level += 1
      this.maze = createMaze(this.seed, this.level)
      this.resetActors()
      this.mode = 'playing'
      this.graceUntil = now + 1200
      this.emit()
      return
    }
    if (this.mode !== 'playing') return
    const step = Math.min(0.05, dt)
    this.activeMs += step * 1000
    this.moveRoomba(step, now)
    this.movePets(step, now)
    this.collect(now)
    this.collisions(now)
    if (!this.maze.pellets.size && !this.maze.items.size && this.mode === 'playing') {
      this.mode = 'level-clear'; this.transitionUntil = now + 1250; this.options.onSound('clear'); this.emit()
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, now: number) {
    const cell = Math.min(width / this.maze.width, height / this.maze.height)
    const ox = (width - cell * this.maze.width) / 2
    const oy = (height - cell * this.maze.height) / 2
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#ead9b9'; ctx.fillRect(0, 0, width, height)
    const floor = FLOOR_RECTS[this.maze.theme]
    ctx.imageSmoothingEnabled = false
    for (let y = 0; y < this.maze.height; y += 1) for (let x = 0; x < this.maze.width; x += 1) {
      const dx = ox + x * cell, dy = oy + y * cell
      if (this.atlas.complete && this.atlas.naturalWidth) ctx.drawImage(this.atlas, floor[0], floor[1], floor[2], floor[3], dx, dy, cell + 0.5, cell + 0.5)
      else { ctx.fillStyle = this.maze.theme % 2 ? '#dbc49b' : '#d6bd8e'; ctx.fillRect(dx, dy, cell + 0.5, cell + 0.5) }
    }
    this.drawFurniture(ctx, cell, ox, oy)
    ctx.fillStyle = '#f6df78'
    for (const key of this.maze.pellets) {
      const [x, y] = key.split(',').map(Number)
      ctx.beginPath(); ctx.arc(ox + (x + .5) * cell, oy + (y + .5) * cell, Math.max(2, cell * .105), 0, Math.PI * 2); ctx.fill()
    }
    let itemIndex = 0
    for (const key of this.maze.items) {
      const [x, y] = key.split(',').map(Number)
      const pulse = 1 + Math.sin(now / 180 + itemIndex) * .12
      this.drawAtlas(ctx, ITEM_RECTS[(this.level * 3 + itemIndex) % ITEM_RECTS.length], ox + (x + .5) * cell, oy + (y + .5) * cell, cell * .86 * pulse)
      itemIndex += 1
    }
    const frightened = now < this.frightenedUntil
    for (const pet of this.pets) {
      if (!pet.released || pet.eatenUntil > now) continue
      const point = actorPoint(pet)
      const frame = Math.floor((now + pet.id * 41) / 115) % 2
      const runningBob = Math.sin(now / 58 + pet.id) * cell * .055
      ctx.save()
      if (frightened) ctx.filter = `hue-rotate(165deg) saturate(1.8) brightness(${this.frightenedUntil - now < 1500 && Math.floor(now / 150) % 2 ? 1.8 : .85})`
      if (this.atlas.complete && this.atlas.naturalWidth) {
        this.drawAtlasSprite(ctx, PET_FRAMES[pet.id][pet.direction][frame], ox + (point.x + .5) * cell, oy + (point.y + .5) * cell + runningBob, cell * 1.42, pet.direction === 'left')
      }
      else { ctx.fillStyle = frightened ? '#3274d9' : PET_COLORS[pet.id]; ctx.beginPath(); ctx.arc(ox + (point.x + .5) * cell, oy + (point.y + .5) * cell, cell * .42, 0, Math.PI * 2); ctx.fill() }
      ctx.restore()
    }
    const rp = actorPoint(this.roomba)
    const jiggle = this.mode === 'playing' ? Math.sin(now / 70) * cell * .035 : 0
    const roombaFrame = Math.floor(now / 105) % ROOMBA_FRAMES.length
    const roombaRotation: Record<Direction, number> = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }
    if (this.atlas.complete && this.atlas.naturalWidth) {
      this.drawAtlasSprite(ctx, ROOMBA_FRAMES[roombaFrame], ox + (rp.x + .5) * cell, oy + (rp.y + .5) * cell + jiggle, cell * 1.34, false, roombaRotation[this.roomba.direction])
    }
    else { ctx.fillStyle = '#f4eee4'; ctx.beginPath(); ctx.arc(ox + (rp.x + .5) * cell, oy + (rp.y + .5) * cell, cell * .47, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#4b4640'; ctx.stroke() }
    if (now < this.graceUntil && Math.floor(now / 100) % 2) {
      ctx.strokeStyle = '#fff8c7'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ox + (rp.x + .5) * cell, oy + (rp.y + .5) * cell, cell * .62, 0, Math.PI * 2); ctx.stroke()
    }
  }

  private drawAtlas(ctx: CanvasRenderingContext2D, rect: readonly [number, number, number, number], x: number, y: number, size: number) {
    ctx.drawImage(this.atlas, rect[0], rect[1], rect[2], rect[3], x - size / 2, y - size / 2, size, size)
  }

  private drawAtlasSprite(ctx: CanvasRenderingContext2D, rect: AtlasRect, x: number, y: number, height: number, flipX = false, rotation = 0) {
    const width = height * rect[2] / rect[3]
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rotation)
    ctx.scale(flipX ? -1 : 1, 1)
    ctx.drawImage(this.atlas, rect[0], rect[1], rect[2], rect[3], -width / 2, -height / 2, width, height)
    ctx.restore()
  }

  private drawAtlasBox(ctx: CanvasRenderingContext2D, rect: AtlasRect, x: number, y: number, width: number, height: number, flipX = false, rotation = 0) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rotation)
    ctx.scale(flipX ? -1 : 1, 1)
    ctx.drawImage(this.atlas, rect[0], rect[1], rect[2], rect[3], -width / 2, -height / 2, width, height)
    ctx.restore()
  }

  private drawFurniture(ctx: CanvasRenderingContext2D, cell: number, ox: number, oy: number) {
    if (!(this.atlas.complete && this.atlas.naturalWidth)) {
      for (let y = 0; y < this.maze.height; y += 1) for (let x = 0; x < this.maze.width; x += 1) {
        if (this.maze.cells[y][x] !== 1) continue
        ctx.fillStyle = (x + y) % 2 ? '#775033' : '#604126'
        ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell)
      }
      return
    }

    for (let x = 0; x < this.maze.width; x += 3) {
      const span = Math.min(3, this.maze.width - x)
      const centerX = ox + (x + span / 2) * cell
      this.drawAtlasBox(ctx, BORDER_RECT, centerX, oy + cell / 2, span * cell, cell)
      this.drawAtlasBox(ctx, BORDER_RECT, centerX, oy + (this.maze.height - .5) * cell, span * cell, cell, false, Math.PI)
    }
    for (let y = 1; y < this.maze.height - 1; y += 3) {
      const span = Math.min(3, this.maze.height - 1 - y)
      const centerY = oy + (y + span / 2) * cell
      this.drawAtlasBox(ctx, BORDER_RECT, ox + cell / 2, centerY, span * cell, cell, false, Math.PI / 2)
      this.drawAtlasBox(ctx, BORDER_RECT, ox + (this.maze.width - .5) * cell, centerY, span * cell, cell, false, -Math.PI / 2)
    }
    for (const piece of this.maze.furniture) {
      this.drawFurniturePiece(ctx, piece, cell, ox, oy)
    }
  }

  private drawFurniturePiece(ctx: CanvasRenderingContext2D, piece: FurniturePiece, cell: number, ox: number, oy: number) {
    const centerX = ox + (piece.x + piece.width / 2) * cell
    const centerY = oy + (piece.y + piece.height / 2) * cell
    if (piece.kind === 'pen') {
      this.drawAtlasBox(ctx, FURNITURE_RECTS.pen, centerX, centerY, piece.width * cell, piece.height * cell)
      return
    }
    const baseWidth = piece.kind === 'i' ? 5 : 3
    const baseHeight = piece.kind === 'i' ? 1 : 3
    const rect = FURNITURE_RECTS[piece.kind]
    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.scale(piece.flipX ? -1 : 1, 1)
    ctx.rotate((piece.rotation ?? 0) * Math.PI / 2)
    ctx.drawImage(this.atlas, rect[0], rect[1], rect[2], rect[3], -baseWidth * cell / 2, -baseHeight * cell / 2, baseWidth * cell, baseHeight * cell)
    ctx.restore()
  }

  private resetActors() {
    this.roomba = { ...this.maze.spawn, direction: 'right', nextDirection: 'right', progress: 0 }
    this.pets = Array.from({ length: 5 }, (_, id) => ({ id, x: this.maze.pen.x - 2 + id, y: this.maze.pen.y, home: { ...this.maze.pen }, direction: 'up' as Direction, nextDirection: 'up' as Direction, progress: 0, released: false, eatenUntil: 0 }))
    this.nextPetRelease = 0
    this.nextPetReleaseAt = this.activeMs + 1500
  }

  private moveRoomba(dt: number, now: number) {
    this.advance(this.roomba, roombaSpeed(this.level) * dt, () => {
      const queued = DIRS[this.roomba.nextDirection]
      if (isWalkable(this.maze, { x: this.roomba.x + queued.x, y: this.roomba.y + queued.y })) {
        if (this.roomba.direction !== this.roomba.nextDirection) this.options.onSound('turn')
        this.roomba.direction = this.roomba.nextDirection
      }
      const delta = DIRS[this.roomba.direction]
      if (!isWalkable(this.maze, { x: this.roomba.x + delta.x, y: this.roomba.y + delta.y })) {
        if (now - this.lastBump > 240) { this.options.onSound('bump'); this.lastBump = now }
        return false
      }
      return true
    })
  }

  private movePets(dt: number, now: number) {
    const availablePets = this.level >= 3 ? this.pets.length : this.pets.length - 1
    if (this.nextPetRelease < availablePets && this.activeMs >= this.nextPetReleaseAt) {
      this.pets[this.nextPetRelease].released = true
      this.nextPetRelease += 1
      this.nextPetReleaseAt = this.activeMs + Math.max(2800, 5000 - (this.level - 1) * 200)
    }
    this.pets.forEach((pet) => {
      const available = pet.id < 4 || this.level >= 3
      if (!available) return
      if (!pet.released || pet.eatenUntil > now) return
      this.advance(pet, petSpeed(this.level) * dt, () => {
        const options = availableDirections(this.maze, pet).filter((direction) => direction !== OPPOSITE[pet.direction])
        const choices = options.length ? options : availableDirections(this.maze, pet)
        if (!choices.length) return false
        const target = this.petTarget(pet)
        if (now < this.frightenedUntil) pet.direction = choices[Math.floor(this.random() * choices.length)]
        else pet.direction = choices.sort((a, b) => this.distanceAfter(pet, a, target) - this.distanceAfter(pet, b, target))[0]
        return true
      })
    })
  }

  private petTarget(pet: Pet) {
    const delta = DIRS[this.roomba.direction]
    if (pet.id === 1) return { x: this.roomba.x + delta.x * 4, y: this.roomba.y + delta.y * 4 }
    if (pet.id === 2) return { x: this.maze.width - 2 - this.roomba.x, y: this.roomba.y }
    if (pet.id === 3 && Math.abs(pet.x - this.roomba.x) + Math.abs(pet.y - this.roomba.y) < 5) return { x: 1, y: 1 }
    if (pet.id === 4) return { x: this.roomba.x, y: this.maze.height - 1 - this.roomba.y }
    return { x: this.roomba.x, y: this.roomba.y }
  }

  private distanceAfter(pet: Pet, direction: Direction, target: Point) {
    const d = DIRS[direction]
    return Math.abs(pet.x + d.x - target.x) + Math.abs(pet.y + d.y - target.y)
  }

  private advance(actor: Actor, distance: number, canLeave: () => boolean) {
    let remaining = distance
    while (remaining > 0) {
      if (actor.progress === 0 && !canLeave()) return
      const chunk = Math.min(1 - actor.progress, remaining)
      actor.progress += chunk; remaining -= chunk
      if (actor.progress >= .999999) {
        const delta = DIRS[actor.direction]
        actor.x += delta.x; actor.y += delta.y; actor.progress = 0
      }
    }
  }

  private collect(now: number) {
    if (this.roomba.progress > .35) return
    const key = pointKey(this.roomba)
    if (this.maze.pellets.delete(key)) { this.dots += 1; this.score = calculateScore({ dots: this.dots, items: this.items, pets: this.petsEaten }); this.options.onSound('dot'); this.emit() }
    if (this.maze.items.delete(key)) { this.items += 1; this.score = calculateScore({ dots: this.dots, items: this.items, pets: this.petsEaten }); this.frightenedUntil = now + frightenedDuration(this.level); this.options.onSound('item'); this.emit() }
  }

  private collisions(now: number) {
    if (now < this.graceUntil) return
    const roomba = actorPoint(this.roomba)
    for (const pet of this.pets) {
      if (!pet.released || pet.eatenUntil > now) continue
      const point = actorPoint(pet)
      if (Math.hypot(roomba.x - point.x, roomba.y - point.y) >= .58) continue
      if (now < this.frightenedUntil) {
        this.petsEaten += 1; this.score = calculateScore({ dots: this.dots, items: this.items, pets: this.petsEaten })
        pet.eatenUntil = now + 3000; pet.released = false; pet.x = pet.home.x; pet.y = pet.home.y; pet.progress = 0
        window.setTimeout(() => { pet.released = true }, 3000)
        this.options.onSound('pet'); this.emit()
      } else {
        this.lives -= 1; this.mode = 'life-lost'; this.transitionUntil = now + 1400; this.options.onSound('hit'); this.emit(); return
      }
    }
  }

  private emit() { this.options.onSnapshot(this.snapshot()) }
}
