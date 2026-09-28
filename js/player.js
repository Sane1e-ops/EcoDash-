class PlayerDrone {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.velocityX = 0;
    this.velocityY = 0;
    this.acceleration = 470; // World pixels per second squared.
    this.maximumSpeed = 255; // World pixels per second.
    this.drag = 0.91; // Velocity retained each second when no thrust is applied.
    this.rotation = -Math.PI / 2;
    this.radius = 18;
    this.battery = 100;
    this.cargoLoaded = true;
    this.hitCooldown = 0;
    this.flashTime = 0;
  }

  update(deltaTime, controls, weatherWind, terrainDrain, charging, outage, onCollision) {
    // Normalize diagonal key input so flying diagonally does not increase total thrust.
    let inputX = Number(controls.right) - Number(controls.left);
    let inputY = Number(controls.down) - Number(controls.up);
    const inputLength = Math.hypot(inputX, inputY);
    if (inputLength > 0) {
      inputX /= inputLength;
      inputY /= inputLength;
      // Trigonometry turns the input heading into a unit vector for acceleration.
      // cos(angle) gives its horizontal component; sin(angle) gives its vertical one.
      const heading = Math.atan2(inputY, inputX);
      this.rotation = heading;
      this.velocityX += Math.cos(heading) * this.acceleration * deltaTime;
      this.velocityY += Math.sin(heading) * this.acceleration * deltaTime;
    }

    // Wind is another acceleration vector. Its direction comes from the weather system.
    this.velocityX += weatherWind.x * deltaTime;
    this.velocityY += weatherWind.y * deltaTime;

    // Exponential drag makes slowing consistent across different frame rates.
    const dragThisFrame = Math.pow(this.drag, deltaTime * 60);
    this.velocityX *= dragThisFrame;
    this.velocityY *= dragThisFrame;

    const speed = Math.hypot(this.velocityX, this.velocityY);
    if (speed > this.maximumSpeed) {
      const speedScale = this.maximumSpeed / speed;
      this.velocityX *= speedScale;
      this.velocityY *= speedScale;
    }

    const previousX = this.x;
    const previousY = this.y;
    this.x += this.velocityX * deltaTime;
    this.y += this.velocityY * deltaTime;

    // Drain is proportional to flight time and extra environmental difficulty.
    if (speed > 7) this.battery -= (0.075 + speed / this.maximumSpeed * 0.045) * terrainDrain * deltaTime;
    if (charging && !outage) this.battery += 9.5 * deltaTime;
    this.battery = clamp(this.battery, 0, 100);

    this.hitCooldown = Math.max(0, this.hitCooldown - deltaTime);
    this.flashTime = Math.max(0, this.flashTime - deltaTime);
    if (this.hitCooldown === 0) onCollision(this, previousX, previousY);

    if (speed > 15) this.rotation = Math.atan2(this.velocityY, this.velocityX);
  }

  collide(previousX, previousY, penalty = 10) {
    this.x = previousX;
    this.y = previousY;
    this.velocityX *= -0.32;
    this.velocityY *= -0.32;
    this.battery = Math.max(0, this.battery - penalty);
    this.hitCooldown = 0.8;
    this.flashTime = 0.45;
  }

  draw(context, time, isCharging) {
    context.save();
    context.translate(this.x, this.y);
    context.rotate(this.rotation + Math.PI / 2);
    const blink = this.flashTime > 0 && Math.floor(time * 18) % 2 === 0;
    context.globalAlpha = blink ? 0.45 : 1;

    // Animated rotor lines provide a clear visual signal that the drone is powered.
    const rotorWave = Math.sin(time * 24) * 2;
    context.strokeStyle = '#263b2a';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(-16, -9); context.lineTo(16, -9);
    context.moveTo(-16, 9); context.lineTo(16, 9);
    context.stroke();
    for (const rotorX of [-16, 16]) {
      for (const rotorY of [-9, 9]) {
        context.beginPath();
        context.ellipse(rotorX, rotorY, 7 + rotorWave, 2.5, 0, 0, Math.PI * 2);
        context.fillStyle = '#17251b'; context.fill();
      }
    }
    context.beginPath();
    context.roundRect(-11, -7, 22, 22, 6);
    context.fillStyle = '#d7ec87'; context.fill();
    context.strokeStyle = '#30442a'; context.lineWidth = 1.5; context.stroke();
    context.beginPath(); context.arc(0, 2, 4, 0, Math.PI * 2);
    context.fillStyle = '#31482c'; context.fill();
    context.beginPath(); context.moveTo(-5, 15); context.lineTo(0, 21); context.lineTo(5, 15);
    context.fillStyle = '#f0e6c1'; context.fill();
    if (this.cargoLoaded) {
      context.beginPath(); context.roundRect(-5, 19, 10, 8, 2);
      context.fillStyle = '#e88758'; context.fill();
      context.fillStyle = '#fff1d8'; context.fillRect(-1, 20, 2, 6);
      context.fillRect(-3, 22, 6, 2);
    }
    if (isCharging) {
      context.strokeStyle = `rgba(213,239,112,${0.5 + Math.sin(time * 5) * 0.2})`;
      context.lineWidth = 2; context.beginPath(); context.arc(0, 5, 28 + Math.sin(time * 4) * 3, 0, Math.PI * 2); context.stroke();
    }
    context.restore();
  }
}
