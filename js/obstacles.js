class Obstacle {
  constructor(options) { Object.assign(this, options); }

  collidesWith(drone) {
    if (this.radius) return distanceBetween(this, drone) < this.radius + drone.radius;
    return circleOverlapsRectangle(drone, this);
  }

  draw(context, time) {
    context.save();
    if (this.type === 'pothole') {
      context.fillStyle = '#463c2b'; context.beginPath(); context.ellipse(this.x, this.y, this.radius, this.radius * 0.72, -0.2, 0, Math.PI * 2); context.fill();
      context.strokeStyle = '#78664a'; context.lineWidth = 2; context.stroke();
      context.fillStyle = '#2e3026'; context.beginPath(); context.ellipse(this.x - 3, this.y - 2, this.radius * .55, this.radius * .34, -.2, 0, Math.PI * 2); context.fill();
    } else if (this.type === 'tree') {
      context.translate(this.x, this.y); context.rotate(-.26);
      context.fillStyle = '#654a31'; context.beginPath(); context.roundRect(-this.width / 2, -5, this.width, 10, 4); context.fill();
      for (let index = 0; index < 5; index += 1) { context.beginPath(); context.arc(-this.width / 2 + index * this.width / 4, Math.sin(index * 2) * 7, 12, 0, Math.PI * 2); context.fillStyle = index % 2 ? '#526540' : '#697448'; context.fill(); }
    } else if (this.type === 'wildlife') {
      context.fillStyle = '#cfb881'; context.beginPath(); context.ellipse(this.x, this.y, 13, 8, .2, 0, Math.PI * 2); context.fill();
      context.beginPath(); context.arc(this.x + 11, this.y - 5, 6, 0, Math.PI * 2); context.fill();
      context.strokeStyle = '#eadbb6'; context.lineWidth = 2; context.beginPath(); context.moveTo(this.x + 12, this.y - 9); context.lineTo(this.x + 16, this.y - 16); context.moveTo(this.x + 9, this.y - 10); context.lineTo(this.x + 9, this.y - 17); context.stroke();
      context.strokeStyle = '#574831'; context.lineWidth = 2; context.beginPath(); context.moveTo(this.x - 8, this.y + 5); context.lineTo(this.x - 10, this.y + 11); context.moveTo(this.x + 6, this.y + 5); context.lineTo(this.x + 7, this.y + 11); context.stroke();
    } else if (this.type === 'construction') {
      context.fillStyle = '#a65e3d'; context.fillRect(this.x, this.y, this.width, this.height);
      context.strokeStyle = '#edc270'; context.lineWidth = 4; context.setLineDash([9, 6]); context.strokeRect(this.x + 3, this.y + 3, this.width - 6, this.height - 6); context.setLineDash([]);
      context.fillStyle = '#f0d6a2'; context.font = '10px monospace'; context.fillText('WORKS', this.x + 9, this.y + this.height / 2 + 3);
    } else if (this.type === 'traffic') {
      context.fillStyle = '#392f25'; context.beginPath(); context.roundRect(this.x, this.y, this.width, this.height, 5); context.fill();
      context.fillStyle = this.color || '#bb7650'; context.beginPath(); context.roundRect(this.x + 4, this.y + 4, this.width - 8, this.height - 8, 3); context.fill();
      context.fillStyle = '#f4e2af'; context.fillRect(this.x + 6, this.y + 5, 5, 3); context.fillRect(this.x + this.width - 11, this.y + 5, 5, 3);
    }
    context.restore();
  }
}

function createWorld() {
  const obstacles = [
    new Obstacle({ type: 'pothole', x: 740, y: 416, radius: 19 }),
    new Obstacle({ type: 'pothole', x: 1147, y: 1140, radius: 21 }),
    new Obstacle({ type: 'pothole', x: 1880, y: 598, radius: 17 }),
    new Obstacle({ type: 'tree', x: 1080, y: 350, width: 68, height: 20 }),
    new Obstacle({ type: 'tree', x: 1590, y: 1132, width: 77, height: 20 }),
    new Obstacle({ type: 'wildlife', x: 550, y: 905, radius: 19 }),
    new Obstacle({ type: 'wildlife', x: 1810, y: 900, radius: 19 }),
    new Obstacle({ type: 'construction', x: 1017, y: 722, width: 92, height: 72 }),
    new Obstacle({ type: 'traffic', x: 380, y: 620, width: 36, height: 20, color: '#a77553' }),
    new Obstacle({ type: 'traffic', x: 1730, y: 480, width: 37, height: 21, color: '#789579' })
  ];
  // Solar hubs are circular interaction zones. The blackout is a temporary outage.
  const chargingStations = [
    { x: 1195, y: 345, radius: 68, name: 'Kijani Solar Hub' },
    { x: 625, y: 1135, radius: 68, name: 'Maji Microgrid' },
    { x: 1810, y: 1025, radius: 68, name: 'Eastern Solar Hub' }
  ];
  const loadSheddingZones = [
    { x: 1195, y: 345, radius: 107, active: false, nextChange: 11 },
    { x: 1810, y: 1025, radius: 107, active: false, nextChange: 23 }
  ];
  return { obstacles, chargingStations, loadSheddingZones };
}
