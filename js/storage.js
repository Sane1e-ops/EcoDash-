const HIGH_SCORE_KEY = 'ecodash-high-score-v1';

function loadHighScore() {
  try {
    const savedScore = Number(localStorage.getItem(HIGH_SCORE_KEY));
    return Number.isFinite(savedScore) && savedScore > 0 ? savedScore : 0;
  } catch (error) {
    // Private browsing or a restrictive browser policy may disable localStorage.
    console.warn('EcoDash could not read the saved high score.', error);
    return 0;
  }
}

function saveHighScore(score) {
  try {
    const currentBest = loadHighScore();
    const newBest = Math.max(currentBest, Math.floor(score));
    localStorage.setItem(HIGH_SCORE_KEY, String(newBest));
    return newBest;
  } catch (error) {
    console.warn('EcoDash could not save the high score.', error);
    return Math.floor(score);
  }
}
