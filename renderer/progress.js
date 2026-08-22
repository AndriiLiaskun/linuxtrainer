// Progress/XP/streak/badges tracking. Persists via Electron IPC to a JSON
// file in userData when running inside Electron; falls back to
// localStorage when opened as a plain file (useful for quick UI testing).
'use strict';

const LEVEL_STEP = 100; // XP needed per level grows linearly by this amount

function xpForLevel(level) {
  // total XP required to REACH this level (level 1 = 0 XP)
  let total = 0;
  for (let i = 1; i < level; i++) total += i * LEVEL_STEP;
  return total;
}

function levelFromXp(xp) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

const BADGES = [
  { id: 'first-steps', title: 'Перші кроки', desc: 'Виконай свій перший дрил', icon: '🌱' },
  { id: 'lesson-complete', title: 'Урок пройдено', desc: 'Заверши цілий урок', icon: '✅' },
  { id: 'streak-3', title: 'Три дні поспіль', desc: 'Тренуйся 3 дні поспіль', icon: '🔥' },
  { id: 'streak-7', title: 'Тижневий марафон', desc: 'Тренуйся 7 днів поспіль', icon: '🏆' },
  { id: 'fifty-drills', title: 'Пів сотні', desc: 'Виконай 50 дрилів', icon: '💪' },
  { id: 'all-lessons', title: 'DevOps Master', desc: 'Заверши весь курс', icon: '👑' },
  { id: 'text-ninja', title: 'Text Ninja', desc: 'Заверши урок "Обробка тексту"', icon: '🥷' },
  { id: 'container-captain', title: 'Container Captain', desc: 'Заверши урок Docker', icon: '🐳' },
];

function hasElectron() {
  try {
    return !!(window.require && window.require('electron').ipcRenderer);
  } catch (e) {
    return false;
  }
}

class ProgressStore {
  constructor() {
    this._electron = hasElectron();
    this._ipc = this._electron ? window.require('electron').ipcRenderer : null;
    this.data = null;
  }

  async load() {
    if (this._electron) {
      this.data = await this._ipc.invoke('progress:load');
    } else {
      try {
        this.data = JSON.parse(localStorage.getItem('linuxtrainer.progress'));
      } catch (e) {
        this.data = null;
      }
    }
    if (!this.data) {
      this.data = {
        version: 1,
        xp: 0,
        streak: 0,
        lastActiveDate: null,
        completedDrills: {},
        badges: [],
        lastLessonId: null,
      };
    }
    this._touchStreak();
    return this.data;
  }

  async save() {
    if (this._electron) {
      await this._ipc.invoke('progress:save', this.data);
    } else {
      localStorage.setItem('linuxtrainer.progress', JSON.stringify(this.data));
    }
  }

  async reset() {
    if (this._electron) {
      this.data = await this._ipc.invoke('progress:reset');
    } else {
      localStorage.removeItem('linuxtrainer.progress');
      await this.load();
    }
    return this.data;
  }

  _todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  _touchStreak() {
    const today = this._todayStr();
    if (this.data.lastActiveDate === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (this.data.lastActiveDate === yesterday) {
      this.data.streak += 1;
    } else if (this.data.lastActiveDate !== null) {
      this.data.streak = 1;
    } else {
      this.data.streak = 0; // no activity yet this session until first drill
    }
    this.data.lastActiveDate = today;
  }

  recordActivity() {
    const today = this._todayStr();
    if (this.data.streak === 0) this.data.streak = 1;
    this.data.lastActiveDate = today;
  }

  isDrillCompleted(lessonId, drillId) {
    return !!(this.data.completedDrills[lessonId] && this.data.completedDrills[lessonId].includes(drillId));
  }

  completedCountFor(lessonId) {
    return (this.data.completedDrills[lessonId] || []).length;
  }

  totalCompleted() {
    return Object.values(this.data.completedDrills).reduce((sum, arr) => sum + arr.length, 0);
  }

  // Returns { xpGained, leveledUp, newBadges }
  completeDrill(lessonId, drillId, xp, allLessons) {
    const wasFirstEverActivity = this.data.lastActiveDate === null;
    this.recordActivity();
    if (!this.data.completedDrills[lessonId]) this.data.completedDrills[lessonId] = [];
    const already = this.data.completedDrills[lessonId].includes(drillId);
    let xpGained = 0;
    const beforeLevel = levelFromXp(this.data.xp);
    if (!already) {
      this.data.completedDrills[lessonId].push(drillId);
      xpGained = xp;
      this.data.xp += xp;
    }
    const afterLevel = levelFromXp(this.data.xp);

    const newBadges = [];
    const award = (id) => {
      if (!this.data.badges.includes(id)) {
        this.data.badges.push(id);
        newBadges.push(BADGES.find((b) => b.id === id));
      }
    };

    if (!already) {
      if (this.totalCompleted() === 1) award('first-steps');
      if (this.totalCompleted() >= 50) award('fifty-drills');
      if (this.data.streak >= 3) award('streak-3');
      if (this.data.streak >= 7) award('streak-7');

      const lesson = allLessons.find((l) => l.id === lessonId);
      if (lesson && this.completedCountFor(lessonId) === lesson.drills.length) {
        award('lesson-complete');
        if (lessonId === 'text-processing') award('text-ninja');
        if (lessonId === 'docker') award('container-captain');
      }
      const allDone = allLessons.every((l) => this.completedCountFor(l.id) === l.drills.length);
      if (allDone) award('all-lessons');
    }

    return { xpGained, leveledUp: afterLevel > beforeLevel, newLevel: afterLevel, newBadges };
  }
}

module.exports = { ProgressStore, levelFromXp, xpForLevel, LEVEL_STEP, BADGES };
