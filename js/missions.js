const DESTINATIONS = [
  { name: 'Maji Village', x: 2070, y: 275, color: '#eed6a3', icon: 'M' },
  { name: 'Kijani Clinic', x: 1950, y: 1330, color: '#e7c2a1', icon: '+' },
  { name: 'Nuru Learning Hub', x: 480, y: 1310, color: '#e5d39b', icon: 'N' },
  { name: 'Pamoja Market', x: 390, y: 320, color: '#e8c28a', icon: 'P' },
  { name: 'Kito Community', x: 1260, y: 1240, color: '#e7d2a5', icon: 'K' },
  { name: 'Mwangaza School', x: 1430, y: 300, color: '#e2c79b', icon: 'S' }
];

const CARGO_TYPES = [
  { type: 'MEDICAL SUPPLIES', title: 'Care package', description: 'Deliver essential care supplies to the community.', icon: '✚' },
  { type: 'LEARNING MATERIALS', title: 'Learning kit', description: 'Bring books and learning tools to local students.', icon: '▤' },
  { type: 'FRESH PRODUCE', title: 'Market basket', description: 'Connect local growers with a nearby community.', icon: '✿' },
  { type: 'SOLAR PARTS', title: 'Repair kit', description: 'Carry microgrid components for a local energy hub.', icon: 'ϟ' }
];

class MissionManager {
  constructor(origin) {
    this.origin = origin;
    this.deliveriesCompleted = 0;
    this.missionNumber = 0;
    this.destinationIndex = -1;
    this.current = null;
    this.progress = 0;
    this.assignNext();
  }

  assignNext() {
    const availableIndices = [];
    for (let index = 0; index < DESTINATIONS.length; index += 1) {
      if (index !== this.destinationIndex) {
        availableIndices.push(index);
      }
    }

    const randomChoice = Math.floor(Math.random() * availableIndices.length);
    this.destinationIndex = availableIndices[randomChoice];
    this.missionNumber += 1;
    const cargo = CARGO_TYPES[(this.missionNumber - 1) % CARGO_TYPES.length];
    this.current = {
      type: cargo.type,
      title: cargo.title,
      description: cargo.description,
      icon: cargo.icon,
      destination: DESTINATIONS[this.destinationIndex],
      reward: 500,
      start: { x: this.origin.x, y: this.origin.y }
    };
    this.progress = 0;
  }

  update(drone, onDelivery) {
    const distanceToGoal = distanceBetween(drone, this.current.destination);
    const routeDistance = distanceBetween(this.current.start, this.current.destination);
    this.progress = 1 - distanceToGoal / routeDistance;
    if (this.progress < 0) this.progress = 0;
    if (this.progress > 1) this.progress = 1;
    if (distanceToGoal < 48) {
      this.deliveriesCompleted += 1;
      drone.cargoLoaded = false;
      onDelivery(this.current.destination, this.current.reward);
      this.assignNext();
      drone.cargoLoaded = true;
      return true;
    }
    return false;
  }
}
