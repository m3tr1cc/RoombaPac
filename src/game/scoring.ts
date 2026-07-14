export const DOT_POINTS = 100
export const ITEM_POINTS = 1000
export const PET_POINTS = 2000
export type RunStats = { dots: number; items: number; pets: number }
export const calculateScore = ({ dots, items, pets }: RunStats) => dots * DOT_POINTS + items * ITEM_POINTS + pets * PET_POINTS
export const roombaSpeed = (level: number) => Math.min(18, 5.25 * Math.pow(1.06, Math.max(0, level - 1)))
export const petSpeed = (level: number) => Math.min(19, 4.35 * Math.pow(1.075, Math.max(0, level - 1)))
export const frightenedDuration = (level: number) => Math.max(2500, 7000 * Math.pow(0.92, Math.max(0, level - 1)))
