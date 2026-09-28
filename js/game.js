const WORLD = { width: 2400, height: 1600 };
const ORIGIN = { x: 300, y: 800 };
const DELIVERY_GOAL = 5;

class EcoDashGame {
  constructor(canvas, callbacks) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.callbacks = callbacks;
    this.state = 'start';
    this.soundEnabled = true;
    this.audioContext = null;
    this.audio = {
      background: new Audio('assets/audio/soundreality-forest-sound-576537.mp3'),
      start: new Audio('assets/audio/freesound_community-vintage-game-sound-58050.mp3'),
      delivery: new Audio('assets/audio/epic_stock_media-ancient_game_dark_magic_buff_2_fantasy_tonal_accent_hit_stab-386295.mp3'),
      completion: new Audio('assets/audio/ribhavagrawal-achievement-video-game-type-1-230515.mp3'),
      victoryMusic: new Audio('assets/audio/cartoon_music-glockenspiel-cute-ending-music-504467.mp3'),
      gameOver: new Audio('assets/audio/dragon-studio-game-over-retro-8bit-sfx-499656.mp3')
    };
    this.audio.background.loop = true;
    this.audio.background.volume = 0.25;
    this.audio.victoryMusic.loop = true;
    this.audio.victoryMusic.volume = 0.35;
    this.keys = new Set();
    this.width = 800;
    this.height = 450;
    this.pixelRatio = 1;
    this.camera = { x: 0, y: 0 };
    this.particles = new ParticleSystem();
    this.images = {
      tree: this.loadImage('PNG/Default/treeTall.png'),
      palm: this.loadImage('PNG/Default/palm.png'),
      bush: this.loadImage('PNG/Default/bush.png'),
      house: this.loadImage('PNG/Default/house.png')
    };
    this.bindEvents();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.resetData();
    this.lastTime = performance.now();
    requestAnimationFrame((time) => this.loop(time));
  }

  resetData() {
    this.player = new PlayerDrone(ORIGIN.x, ORIGIN.y);
    // Distance tracking starts at the new drone position on every restart.
    this.previousX = this.player.x;
    this.previousY = this.player.y;
    this.missions = new MissionManager(ORIGIN);
    this.weather = new WeatherSystem();
    this.world = createWorld();
    this.score = 0;
    this.distancePixels = 0;
    this.distanceScoreKm = 0;
    this.energySpent = 0;
    this.collisions = 0;
    this.missionStartCollisions = 0;
    this.elapsedTime = 0;
    this.status = 'Ready when you are';
    this.highScore = loadHighScore();
    this.wasCharging = false;
  }

  bindEvents() {
    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      const movementKeys = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '];
      if (movementKeys.includes(key)) {
        event.preventDefault();
      }

      if (key === 'p' || key === 'escape') {
        if (!event.repeat) {
          this.togglePause();
        }
        return;
      }

      this.keys.add(key);
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      if (this.state === 'playing') {
        this.pause();
      }
    });
  }

  resize() {
    const rectangle = this.canvas.getBoundingClientRect();
    if (!rectangle.width || !rectangle.height) return;
    this.width = rectangle.width;
    this.height = rectangle.height;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.pixelRatio);
    this.canvas.height = Math.round(this.height * this.pixelRatio);
    this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
  }

  loadImage(source) {
    const image = new Image();
    image.src = source;
    return image;
  }

  start() {
    this.stopVictoryMusic();
    this.resetData();
    this.state = 'playing';
    this.status = 'Route underway · keep an eye on your battery';
    this.callbacks.onStateChange(this.state);
    this.updateBackgroundAudio();
    this.playSound('start');
  }

  restart() {
    this.start();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'pause';
    this.keys.clear();
    this.updateBackgroundAudio();
    this.callbacks.onStateChange(this.state);
  }

  resume() {
    if (this.state !== 'pause') return;
    this.state = 'playing';
    this.lastTime = performance.now();
    this.updateBackgroundAudio();
    this.callbacks.onStateChange(this.state);
  }

  togglePause() {
    if (this.state === 'playing') {
      this.pause();
    } else if (this.state === 'pause') {
      this.resume();
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.updateBackgroundAudio();
    if (!this.soundEnabled) {
      this.stopVictoryMusic();
    } else if (this.state === 'over' && this.missions.deliveriesCompleted >= DELIVERY_GOAL) {
      this.playVictoryMusic();
    }
    return this.soundEnabled;
  }

  playVictoryMusic() {
    if (!this.soundEnabled) return;
    const music = this.audio.victoryMusic;
    music.currentTime = 0;
    const playback = music.play();
    if (playback) playback.catch(() => {});
  }

  stopVictoryMusic() {
    this.audio.victoryMusic.pause();
    this.audio.victoryMusic.currentTime = 0;
  }

  updateBackgroundAudio() {
    const background = this.audio.background;
    if (!this.soundEnabled || this.state !== 'playing') {
      background.pause();
      background.currentTime = 0;
      return;
    }
    const playback = background.play();
    if (playback) playback.catch(() => {});
  }

  loop(time) {
    // requestAnimationFrame asks the browser for a fresh frame; elapsed seconds
    // keep physics consistent on displays with different refresh rates.
    const deltaTime = Math.min((time - this.lastTime) / 1000, 0.04);
    this.lastTime = time;
    if (this.state === 'playing') this.update(deltaTime);
    this.draw(time / 1000);
    this.callbacks.onHudUpdate(this.getHudStats());
    requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  update(deltaTime) {
    this.elapsedTime += deltaTime;
    const previousBattery = this.player.battery;
    this.weather.update(deltaTime);
    this.updateOutages(deltaTime);
    const chargingStation = this.world.chargingStations.find((station) => distanceBetween(this.player, station) < station.radius);
    const outage = chargingStation && this.world.loadSheddingZones.some((zone) => zone.active && distanceBetween(this.player, zone) < zone.radius);
    const charging = Boolean(chargingStation && !outage);
    const nearbyHazard = this.world.obstacles.some((obstacle) => obstacle.type === 'construction' && this.player.x > obstacle.x - 70 && this.player.x < obstacle.x + obstacle.width + 70 && this.player.y > obstacle.y - 70 && this.player.y < obstacle.y + obstacle.height + 70);
    const terrainDrain = (nearbyHazard ? 1.25 : 1) * this.weather.condition.batteryMultiplier;
    const controls = {
      up: this.keys.has('w') || this.keys.has('arrowup'), down: this.keys.has('s') || this.keys.has('arrowdown'),
      left: this.keys.has('a') || this.keys.has('arrowleft'), right: this.keys.has('d') || this.keys.has('arrowright')
    };
    this.player.update(deltaTime, controls, this.weather.wind, terrainDrain, charging, Boolean(outage), (drone, oldX, oldY) => this.checkCollisions(drone, oldX, oldY));

    // World boundaries act as soft barriers rather than ending the game.
    const boundedX = clamp(this.player.x, 26, WORLD.width - 26);
    const boundedY = clamp(this.player.y, 26, WORLD.height - 26);
    if (boundedX !== this.player.x || boundedY !== this.player.y) {
      this.player.x = boundedX; this.player.y = boundedY;
      this.player.velocityX *= -0.35; this.player.velocityY *= -0.35;
    }

    const frameDistance = distanceBetween(this.player, { x: this.previousX ?? this.player.x, y: this.previousY ?? this.player.y });
    if (this.previousX !== undefined) this.distancePixels += frameDistance;
    // The HUD treats 100 world pixels as one kilometre; award 10 points for
    // each new kilometre, using whole-kilometre checkpoints to avoid fractions.
    const travelledKilometres = Math.floor(this.distancePixels / 100);
    const newKilometres = travelledKilometres - this.distanceScoreKm;
    if (newKilometres > 0) {
      this.score += newKilometres * 10;
      this.distanceScoreKm = travelledKilometres;
    }
    this.previousX = this.player.x; this.previousY = this.player.y;
    this.energySpent += Math.max(0, previousBattery - this.player.battery);
    this.particles.update(deltaTime);
    this.missions.update(this.player, (destination, reward) => {
      const efficiencyBonus = Math.round(this.getEfficiency() * 1.5);
      const cleanRouteBonus = this.collisions === this.missionStartCollisions ? 100 : 0;
      const totalReward = reward + efficiencyBonus + cleanRouteBonus;
      this.score += totalReward;
      this.status = `Delivery complete · ${destination.name} connected · +${totalReward} points`;
      this.missionStartCollisions = this.collisions;
      this.particles.burst(destination.x, destination.y, '#e1ef9b', 24);
      this.playSound('delivery');
      if (this.missions.deliveriesCompleted >= DELIVERY_GOAL) this.finish(true);
    });

    if (charging) {
      this.status = 'Solar microgrid charging';
      if (!this.wasCharging) this.playSound('charge');
    } else if (outage) this.status = 'Load-shedding · hub temporarily offline';
    else if (this.player.battery < 20) this.status = 'Low battery · find an available solar hub';
    this.wasCharging = Boolean(charging && !outage);

    if (this.player.battery <= 0) this.finish(false);
    this.camera.x = clamp(this.player.x - this.width / 2, 0, WORLD.width - this.width);
    this.camera.y = clamp(this.player.y - this.height / 2, 0, WORLD.height - this.height);
  }

  updateOutages(deltaTime) {
    for (const zone of this.world.loadSheddingZones) {
      zone.nextChange -= deltaTime;
      if (zone.nextChange <= 0) {
        zone.active = !zone.active;
        zone.nextChange = zone.active ? 9 : 17;
        if (zone.active) this.status = 'Load-shedding · a solar hub is offline';
      }
    }
  }

  checkCollisions(drone, oldX, oldY) {
    // The river can only be crossed at the two visible bridges. Keeping the
    // check as a segment crossing avoids blocking a drone already on one bank.
    const crossedRiver = (oldX < 1325 && drone.x >= 1325) || (oldX > 1325 && drone.x <= 1325);
    const atBridge = Math.abs(drone.y - 550) < 35 || Math.abs(drone.y - 1110) < 35;
    if (crossedRiver && !atBridge) {
      drone.collide(oldX, oldY, 7);
      this.collisions += 1;
      this.score = Math.max(0, this.score - 35);
      this.status = 'River crossing · use one of the marked bridges';
      this.particles.burst(drone.x, drone.y, '#9bc9c5', 12);
      this.playSound('collision');
      return;
    }
    for (const obstacle of this.world.obstacles) {
      if (obstacle.collidesWith(drone)) {
        drone.collide(oldX, oldY, obstacle.type === 'construction' ? 13 : 8);
        this.collisions += 1;
        this.score = Math.max(0, this.score - 35);
        this.status = `${this.obstacleName(obstacle.type)} · route impact −35 points`;
        this.particles.burst(drone.x, drone.y, '#f0a078', 12);
        this.playSound('collision');
        break;
      }
    }
  }

  obstacleName(type) {
    return ({ pothole: 'Pothole', tree: 'Fallen tree', wildlife: 'Wildlife nearby', construction: 'Construction zone', traffic: 'Road traffic' })[type] || 'Route hazard';
  }

  finish(completed) {
    if (this.state === 'over') return;
    this.state = 'over'; this.keys.clear();
    this.updateBackgroundAudio();
    this.playSound(completed ? 'completion' : 'gameOver');
    if (completed) this.playVictoryMusic();
    this.highScore = saveHighScore(this.score);
    this.status = completed ? 'Five deliveries complete · route report ready' : 'Battery depleted · route report ready';
    this.callbacks.onStateChange('over', { score: this.score, distance: this.distancePixels / 100, deliveries: this.missions.deliveriesCompleted, efficiency: this.getEfficiency(), highScore: this.highScore, completed });
  }

  getEfficiency() {
    if (this.energySpent <= 0) return 100;
    // The baseline is about 0.22 battery points per kilometre in calm conditions.
    const expectedEnergy = (this.distancePixels / 100) * 0.22;
    return clamp((expectedEnergy / this.energySpent) * 100, 0, 100);
  }

  getHudStats() {
    const mission = this.missions.current;
    const stationNearby = this.world.chargingStations.some((station) => distanceBetween(this.player, station) < station.radius);
    const outage = stationNearby && this.world.loadSheddingZones.some((zone) => zone.active && distanceBetween(this.player, zone) < zone.radius);
    return {
      score: this.score, battery: this.player.battery, distance: this.distancePixels / 100,
      efficiency: this.getEfficiency(), deliveries: this.missions.deliveriesCompleted,
      charging: stationNearby,
      outage,
      mission: { number: this.missions.missionNumber, type: mission.type, title: mission.title, description: mission.description, icon: mission.icon, destination: mission.destination, progress: this.missions.progress, range: distanceBetween(this.player, mission.destination) / 100 },
      weather: this.weather.condition, status: this.status, highScore: this.highScore, clock: this.getClockLabel()
    };
  }

  getClockLabel() {
    const dayProgress = (this.elapsedTime % 150) / 150;
    const totalMinutes = Math.floor(8 * 60 + dayProgress * 12 * 60);
    const hour = Math.floor(totalMinutes / 60) % 24;
    const minute = totalMinutes % 60;
    const day = Math.floor(this.elapsedTime / 150) + 1;
    return `DAY ${String(day).padStart(2, '0')} · ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  draw(time) {
    const context = this.context;
    context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    context.clearRect(0, 0, this.width, this.height);
    context.save(); context.translate(-this.camera.x, -this.camera.y);
    this.drawLandscape(context, time);
    this.drawRoutes(context);
    this.drawCommunities(context, time);
    this.drawChargingStations(context, time);
    this.drawMissionMarker(context, time);
    for (const obstacle of this.world.obstacles) obstacle.draw(context, time);
    this.particles.draw(context);
    this.player.draw(context, time, this.isChargingNow());
    context.restore();

    // ORIGINAL FEATURE — DAY / NIGHT CYCLE
    // This isolated section is intentionally easy to find and personalise for the
    // assignment. Change cycleDuration, palette stops, or dusk colour yourself.
    // The angle moves through a full sine wave over cycleDuration seconds.
    this.drawDayNightCycle(context, time);

    this.weather.drawEffects(context, this.width, this.height);
    this.drawCompass(context);
  }

  drawLandscape(context, time) {
    context.fillStyle = '#c4b782'; context.fillRect(0, 0, WORLD.width, WORLD.height);
    // Fine ground marks create visual texture without image assets.
    for (let x = 20; x < WORLD.width; x += 46) {
      for (let y = 18 + (Math.floor(x / 46) % 2) * 17; y < WORLD.height; y += 48) {
        context.fillStyle = (x + y) % 4 ? 'rgba(92,103,63,.16)' : 'rgba(242,221,166,.22)';
        context.beginPath(); context.arc(x, y, (x * y) % 3 + 1, 0, Math.PI * 2); context.fill();
      }
    }
    // River and small banks; two road crossings keep the landscape navigable.
    context.fillStyle = '#678d87'; context.beginPath(); context.moveTo(1280, 0); context.bezierCurveTo(1190, 350, 1370, 490, 1275, 800); context.bezierCurveTo(1190, 1120, 1380, 1280, 1280, 1600); context.lineTo(1380, 1600); context.bezierCurveTo(1475, 1280, 1290, 1110, 1380, 800); context.bezierCurveTo(1470, 490, 1290, 340, 1380, 0); context.closePath(); context.fill();
    context.strokeStyle = '#b9d2b1'; context.lineWidth = 3; context.setLineDash([7, 12]); context.stroke(); context.setLineDash([]);
    this.drawBridge(context, 1320, 550, time); this.drawBridge(context, 1325, 1110, time);
    // Main road and connecting tracks.
    context.lineCap = 'round'; context.strokeStyle = '#ad9064'; context.lineWidth = 48; context.beginPath(); context.moveTo(150, 800); context.bezierCurveTo(610, 730, 780, 590, 1190, 660); context.bezierCurveTo(1510, 720, 1630, 820, 2230, 760); context.stroke();
    context.strokeStyle = '#8a7857'; context.lineWidth = 2; context.setLineDash([12, 14]); context.beginPath(); context.moveTo(150, 800); context.bezierCurveTo(610, 730, 780, 590, 1190, 660); context.bezierCurveTo(1510, 720, 1630, 820, 2230, 760); context.stroke(); context.setLineDash([]);
    const tracks = [[300,800,470,320],[400,780,600,1180],[670,730,700,1320],[780,685,1050,350],[930,635,980,1050],[1190,660,1560,300],[1430,705,1560,1170],[1660,775,2020,280],[1680,780,2060,1300],[990,670,560,310]];
    context.strokeStyle = '#b49a6e'; context.lineWidth = 17;
    for (const [x1,y1,x2,y2] of tracks) { context.beginPath(); context.moveTo(x1,y1); context.lineTo(x2,y2); context.stroke(); }
    this.drawAcaciaTrees(context, time);
  }

  drawBridge(context, x, y, time) {
    context.fillStyle = '#8b7755'; context.fillRect(x - 46, y - 17, 108, 34);
    context.strokeStyle = '#d2bb8a'; context.lineWidth = 3;
    for (let plank = 0; plank < 7; plank += 1) { context.beginPath(); context.moveTo(x - 37 + plank * 15, y - 15); context.lineTo(x - 37 + plank * 15, y + 15); context.stroke(); }
    context.fillStyle = `rgba(230,245,193,${.22 + Math.sin(time * 2) * .1})`; context.fillRect(x - 44, y - 19, 105, 3);
  }

  drawAcaciaTrees(context, time) {
    const trees = [[170,220],[205,490],[255,1280],[350,1440],[500,590],[680,220],[760,970],[870,1420],[940,455],[1040,1250],[1120,960],[1500,510],[1530,1370],[1680,220],[1880,1210],[2010,580],[2180,1050],[2220,1430],[1880,150],[460,1040],[1700,1420],[920,1080]];
    const vegetationTypes = ['tree', 'palm', 'tree', 'bush'];
    for (let index = 0; index < trees.length; index += 1) {
      const [x, y] = trees[index];
      const vegetationType = vegetationTypes[index % vegetationTypes.length];
      const image = this.images[vegetationType];
      const size = vegetationType === 'bush' ? 38 : 52;
      if (image.complete && image.naturalWidth > 0) {
        context.drawImage(image, x - size / 2, y - size / 2, size, size);
        continue;
      }
      context.fillStyle = 'rgba(53,57,37,.18)'; context.beginPath(); context.ellipse(x+7,y+10,24,13,0,0,Math.PI*2); context.fill();
      context.fillStyle = '#765f3e'; context.fillRect(x-3,y-3,7,18);
      context.fillStyle = '#69764b'; context.beginPath(); context.arc(x,y-7,17 + Math.sin(time+x)*.6,0,Math.PI*2); context.fill();
      context.fillStyle = '#85905a'; context.beginPath(); context.arc(x-7,y-11,9,0,Math.PI*2); context.fill();
    }
  }

  drawRoutes(context) {
    const points = [{ x: ORIGIN.x, y: ORIGIN.y }, this.missions.current.destination];
    context.save(); context.strokeStyle = 'rgba(248,240,188,.72)'; context.lineWidth = 2; context.setLineDash([5, 9]);
    context.beginPath(); context.moveTo(points[0].x,points[0].y); context.lineTo(points[1].x,points[1].y); context.stroke(); context.restore();
  }

  drawCommunities(context, time) {
    for (const destination of DESTINATIONS) {
      const isTarget = destination.name === this.missions.current.destination.name;
      context.save();
      context.fillStyle = 'rgba(64,61,43,.17)'; context.beginPath(); context.ellipse(destination.x,destination.y+32,70,32,0,0,Math.PI*2); context.fill();
      const houses = [
        { x: destination.x - 48, y: destination.y - 21 },
        { x: destination.x + 8, y: destination.y - 21 },
        { x: destination.x - 48, y: destination.y + 19 },
        { x: destination.x + 8, y: destination.y + 19 }
      ];
      for (let house = 0; house < houses.length; house += 1) {
        const x = houses[house].x;
        const y = houses[house].y;
        if (this.images.house.complete && this.images.house.naturalWidth > 0) {
          context.drawImage(this.images.house, x - 3, y - 8, 42, 42);
          continue;
        }
        context.fillStyle = house % 2 ? '#d9c8a4' : '#e6d6b4'; context.fillRect(x,y,37,27);
        context.fillStyle = '#966f50'; context.beginPath(); context.moveTo(x-4,y); context.lineTo(x+18,y-15); context.lineTo(x+41,y); context.closePath(); context.fill();
        context.fillStyle = '#74664b'; context.fillRect(x+14,y+11,8,16);
      }
      context.fillStyle = destination.color; context.beginPath(); context.arc(destination.x,destination.y-52,12,0,Math.PI*2); context.fill();
      context.fillStyle = '#33402b'; context.font = 'bold 10px sans-serif'; context.textAlign = 'center'; context.fillText(destination.icon,destination.x,destination.y-48);
      context.font = '10px sans-serif'; context.fillStyle = '#f5efda'; context.fillText(destination.name,destination.x,destination.y+57);
      if (isTarget) {
        const pulse = 27 + Math.sin(time * 3) * 4;
        context.strokeStyle = `rgba(233,245,172,${.7 + Math.sin(time*3)*.2})`; context.lineWidth = 2;
        context.beginPath(); context.arc(destination.x,destination.y,pulse,0,Math.PI*2); context.stroke();
        context.fillStyle = '#eff7c4'; context.beginPath(); context.arc(destination.x,destination.y,4,0,Math.PI*2); context.fill();
      }
      context.restore();
    }
    // Home settlement is distinct from the active delivery destinations.
    context.fillStyle='#e6d6b4'; context.fillRect(230,775,38,26); context.fillStyle='#966f50'; context.beginPath();context.moveTo(226,775);context.lineTo(249,760);context.lineTo(272,775);context.fill();
    context.fillStyle='#f5efda';context.font='10px sans-serif';context.textAlign='center';context.fillText('DISPATCH',249,824);
  }

  drawChargingStations(context, time) {
    for (const station of this.world.chargingStations) {
      const outage = this.world.loadSheddingZones.some((zone) => zone.active && distanceBetween(station,zone)<zone.radius);
      context.fillStyle = outage ? 'rgba(126,105,157,.10)' : 'rgba(205,234,111,.12)';
      context.beginPath(); context.arc(station.x,station.y,station.radius,0,Math.PI*2); context.fill();
      context.strokeStyle=outage?'rgba(165,145,203,.58)':'rgba(221,245,145,.68)';context.lineWidth=2;context.setLineDash([5,7]);context.beginPath();context.arc(station.x,station.y,station.radius,0,Math.PI*2);context.stroke();context.setLineDash([]);
      context.fillStyle=outage?'#a795c6':'#d5ed80';context.beginPath();context.roundRect(station.x-17,station.y-13,34,25,4);context.fill();
      context.fillStyle='#34462d';context.fillRect(station.x-10,station.y-7,8,5);context.fillRect(station.x+2,station.y-7,8,5);
      context.strokeStyle='#455836';context.lineWidth=2;context.beginPath();context.moveTo(station.x,station.y+12);context.lineTo(station.x,station.y+20);context.stroke();
      context.fillStyle='#243326';context.font='9px sans-serif';context.textAlign='center';context.fillText(outage?'GRID OFFLINE':station.name,station.x,station.y+35);
      if (!outage) {
        context.fillStyle=`rgba(224,247,155,${.45+Math.sin(time*4)*.3})`;context.beginPath();context.arc(station.x+21,station.y-18,4,0,Math.PI*2);context.fill();
      }
    }
  }

  drawMissionMarker(context, time) {
    const destination=this.missions.current.destination;
    context.save(); context.strokeStyle='#f5edbe';context.lineWidth=1;context.setLineDash([3,7]);context.beginPath();context.moveTo(destination.x,destination.y-78);context.lineTo(destination.x,destination.y-100);context.stroke();context.setLineDash([]);
    context.fillStyle='#f4e9b0';context.beginPath();context.moveTo(destination.x,destination.y-102);context.lineTo(destination.x+22,destination.y-96);context.lineTo(destination.x,destination.y-89);context.closePath();context.fill();context.restore();
  }

  // PERSONALISE THIS ORIGINAL FEATURE: this is deliberately isolated for your
  // own code-defence changes. Sine eases day -> dusk -> night -> dawn smoothly.
  drawDayNightCycle(context, time) {
    const cycleDuration = 150; // Seconds for one complete visual day.
    const dayAngle = (time % cycleDuration) / cycleDuration * Math.PI * 2 - Math.PI / 2;
    const daylight = (Math.sin(dayAngle) + 1) / 2;
    const duskAmount = 1 - Math.min(1, Math.abs(daylight - .5) * 2);
    context.fillStyle = `rgba(14,24,43,${(1-daylight)*.56})`;
    context.fillRect(0,0,this.width,this.height);
    context.fillStyle = `rgba(226,125,72,${duskAmount*.13})`;
    context.fillRect(0,0,this.width,this.height);
    const skyObjectX = this.width * (.08 + ((time % cycleDuration) / cycleDuration) * .84);
    const skyObjectY = this.height * (.77 - daylight * .62);
    context.save(); context.globalAlpha=.28+daylight*.72; context.fillStyle=daylight>.48?'#fff0ab':'#e8eee0';
    context.beginPath();context.arc(skyObjectX,skyObjectY,daylight>.48?12:8,0,Math.PI*2);context.fill();context.restore();
  }

  drawCompass(context) {
    const x=this.width-28,y=25;
    context.fillStyle='#12231dc9';context.beginPath();context.arc(x,y,17,0,Math.PI*2);context.fill();
    context.fillStyle='#e9efd9';context.font='9px monospace';context.textAlign='center';context.fillText('N',x,y-5);
    context.fillStyle='#d2ec70';context.beginPath();context.moveTo(x,y-1);context.lineTo(x-4,y+8);context.lineTo(x,y+5);context.lineTo(x+4,y+8);context.closePath();context.fill();
  }

  isChargingNow() {
    const station=this.world.chargingStations.find((item)=>distanceBetween(item,this.player)<item.radius);
    return Boolean(station && !this.world.loadSheddingZones.some((zone)=>zone.active&&distanceBetween(zone,this.player)<zone.radius));
  }

  playSound(kind) {
    if (!this.soundEnabled) return;
    const audioTrack = this.audio[kind];
    if (audioTrack) {
      try {
        audioTrack.currentTime = 0;
        const playback = audioTrack.play();
        if (playback) playback.catch(() => {});
      } catch (error) { console.warn('Audio is unavailable in this browser.', error); }
      return;
    }
    try {
      const AudioContextClass=window.AudioContext||window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.audioContext ||= new AudioContextClass();
      if (this.audioContext.state==='suspended') this.audioContext.resume();
      const notes={start:[420],delivery:[620,820,1040],collision:[180],charge:[520,690]}[kind]||[440];
      notes.forEach((frequency,index)=>{
        const oscillator=this.audioContext.createOscillator();const gain=this.audioContext.createGain();
        oscillator.type='sine';oscillator.frequency.value=frequency;
        gain.gain.setValueAtTime(.0001,this.audioContext.currentTime+index*.09);
        gain.gain.exponentialRampToValueAtTime(.09,this.audioContext.currentTime+index*.09+.02);
        gain.gain.exponentialRampToValueAtTime(.0001,this.audioContext.currentTime+index*.09+.16);
        oscillator.connect(gain);gain.connect(this.audioContext.destination);
        oscillator.start(this.audioContext.currentTime+index*.09);oscillator.stop(this.audioContext.currentTime+index*.09+.18);
      });
    } catch (error) { console.warn('Audio is unavailable in this browser.',error); }
  }
}
