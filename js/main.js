const element = (id) => document.getElementById(id);
const canvas = element('game-canvas');
const objectiveChecks = document.querySelectorAll('.objective-check');
const overlays = { start: element('start-overlay'), pause: element('pause-overlay'), over: element('over-overlay') };

const game = new EcoDashGame(canvas, {
  onStateChange: (state, report) => {
    for (const [name, overlay] of Object.entries(overlays)) overlay.classList.toggle('hidden', state !== name);
    element('pause-button').innerHTML = state === 'playing' ? 'Ⅱ <span>Pause</span>' : '▶ <span>Pause</span>';
    element('pause-button').setAttribute('aria-label', state === 'playing' ? 'Pause game' : 'Resume game');
    if (state === 'over') {
      element('final-score').textContent = report.score.toLocaleString();
      element('final-distance').textContent = `${report.distance.toFixed(1)} km`;
      element('final-deliveries').textContent = String(report.deliveries);
      element('final-efficiency').textContent = `${Math.round(report.efficiency)}%`;
      element('final-high-score').textContent = report.highScore.toLocaleString();
      element('over-title').textContent = report.completed ? 'Congratulations!' : 'Energy depleted.';
      element('over-message').textContent = report.completed ? 'You completed all five deliveries. Well done!' : 'The battery is empty. Every safe delivery moved the community forward.';
    }
  },
  onHudUpdate: (stats) => {
    element('battery-value').textContent = `${Math.ceil(stats.battery)}%`;
    element('battery-bar').style.width = `${stats.battery}%`;
    element('battery-bar').style.background = stats.battery < 25 ? '#ec8668' : stats.charging ? '#d2ec70' : '';
    element('battery-state').textContent = stats.charging ? (stats.outage ? 'GRID OUTAGE' : 'CHARGING') : stats.battery < 25 ? 'LOW POWER' : 'IN FLIGHT';
    element('mission-number').textContent = String(stats.mission.number).padStart(2, '0');
    element('cargo-type').textContent = stats.mission.type;
    element('mission-title').textContent = stats.mission.title;
    element('mission-description').textContent = stats.mission.description;
    element('cargo-icon').textContent = stats.mission.icon;
    element('destination-name').textContent = stats.mission.destination.name;
    element('destination-range').textContent = `${stats.mission.range.toFixed(1)} km`;
    element('objective-count').textContent = `${stats.deliveries} / 5`;
    element('objective-checklist').setAttribute('aria-label', `${stats.deliveries} of 5 objectives completed`);
    objectiveChecks.forEach((check, index) => {
      check.classList.toggle('complete', index < stats.deliveries);
    });
    element('mission-progress-label').textContent = `${Math.round(stats.mission.progress * 100)}%`;
    element('mission-progress-bar').style.width = `${stats.mission.progress * 100}%`;
    element('status-message').textContent = stats.status;
    element('clock-label').textContent = stats.clock;
    element('start-high-score').textContent = stats.highScore.toLocaleString();
  }
});

element('start-button').addEventListener('click', () => game.start());
element('resume-button').addEventListener('click', () => game.resume());
element('pause-button').addEventListener('click', () => game.togglePause());
element('pause-restart-button').addEventListener('click', () => game.restart());
element('restart-button').addEventListener('click', () => game.restart());
element('sound-button').addEventListener('click', (event) => {
  const enabled = game.toggleSound();
  event.currentTarget.innerHTML = `${enabled ? '♫' : '♪'} <span>Sound ${enabled ? 'on' : 'off'}</span>`;
});

// The first click/key gesture safely unlocks Web Audio in browsers that require it.
canvas.addEventListener('click', () => canvas.focus());
