// Small reusable maths and drawing helpers keep the game code readable.
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const randomBetween = (min, max) => min + Math.random() * (max - min);

// Euclidean distance is used for circular interaction ranges and delivery checks.
function distanceBetween(a, b) {
  const xDifference = b.x - a.x;
  const yDifference = b.y - a.y;
  return Math.hypot(xDifference, yDifference);
}

// Axis-Aligned Bounding Box (AABB): compare the two rectangles' edges.
function rectanglesOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
    a.y < b.y + b.height && a.y + a.height > b.y;
}

function circleOverlapsRectangle(circle, rectangle) {
  const nearestX = clamp(circle.x, rectangle.x, rectangle.x + rectangle.width);
  const nearestY = clamp(circle.y, rectangle.y, rectangle.y + rectangle.height);
  return distanceBetween(circle, { x: nearestX, y: nearestY }) < circle.radius;
}

function drawRoundedRectangle(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.roundRect(x, y, width, height, safeRadius);
}
