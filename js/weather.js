const CONDITIONS = [
  { name: 'Clear skies', icon: '☀', windStrength: 4, batteryMultiplier: 1 },
  { name: 'Crosswind', icon: '↗', windStrength: 34, batteryMultiplier: 1.25 },
  { name: 'Light rain', icon: '☂', windStrength: 17, batteryMultiplier: 1.12 },
  { name: 'Dusty gusts', icon: '〰', windStrength: 43, batteryMultiplier: 1.4 }
];

class WeatherSystem {
  constructor() {
    this.condition = CONDITIONS[0];
    this.timeUntilChange = 16;
    this.windAngle = randomBetween(0, Math.PI * 2);
    this.rainDrops = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), length: randomBetween(8, 20) }));
  }

  get wind() {
    return { x: Math.cos(this.windAngle) * this.condition.windStrength, y: Math.sin(this.windAngle) * this.condition.windStrength };
  }

  update(deltaTime) {
    this.timeUntilChange -= deltaTime;
    this.windAngle += deltaTime * 0.08;
    if (this.timeUntilChange <= 0) {
      const choices = CONDITIONS.filter((condition) => condition !== this.condition);
      this.condition = choices[Math.floor(Math.random() * choices.length)];
      this.timeUntilChange = randomBetween(18, 30);
      this.windAngle = randomBetween(0, Math.PI * 2);
    }
  }

  drawEffects(context, width, height) {
    if (this.condition.name === 'Light rain') {
      context.save(); context.strokeStyle = 'rgba(205,225,221,.48)'; context.lineWidth = 1;
      for (const drop of this.rainDrops) {
        const x = drop.x * width; const y = drop.y * height;
        context.beginPath(); context.moveTo(x, y); context.lineTo(x - 5, y + drop.length); context.stroke();
      }
      context.restore();
    } else if (this.condition.name === 'Dusty gusts') {
      context.fillStyle = 'rgba(206,165,101,.11)'; context.fillRect(0, 0, width, height);
    }
  }
}
