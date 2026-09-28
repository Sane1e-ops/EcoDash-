class ParticleSystem {
  constructor() { this.particles = []; }

  burst(x, y, color, count = 12) {
    for (let index = 0; index < count; index += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(35, 125);
      this.particles.push({ x, y, velocityX: Math.cos(angle) * speed, velocityY: Math.sin(angle) * speed, life: randomBetween(0.35, 0.8), maximumLife: 0.8, color, size: randomBetween(2, 5) });
    }
  }

  update(deltaTime) {
    for (const particle of this.particles) {
      particle.x += particle.velocityX * deltaTime;
      particle.y += particle.velocityY * deltaTime;
      particle.life -= deltaTime;
      particle.velocityX *= 0.97;
      particle.velocityY *= 0.97;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  draw(context) {
    for (const particle of this.particles) {
      context.globalAlpha = Math.max(0, particle.life / particle.maximumLife);
      context.fillStyle = particle.color;
      context.beginPath(); context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); context.fill();
    }
    context.globalAlpha = 1;
  }
}
