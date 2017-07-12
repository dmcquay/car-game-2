'use strict'

const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d')
canvas.width = window.innerWidth
canvas.height = window.innerHeight
document.body.appendChild(canvas)

const carHeight = 200
const carWidth = 100
const obstacleWidth = 100

const images = {
    car: {
        ready: false,
        src: 'car.png',
        height: 202,
        width: carWidth,
        vector: [[52, 0], [69, 2], [81, 8], [90, 19], [94, 31], [101, 82], [93, 171], [87, 195], [77, 199], [51, 200], [27, 199], [14, 195], [7, 168], [1, 88], [8, 26], [14, 15], [25, 6], [39, 1]]
    },
    'obstacle-box': {
        ready: false,
        src: 'obstacle-box.svg',
        height: obstacleWidth,
        width: obstacleWidth,
        vector: [[0, 0], [100, 0], [100, 100], [0, 100]]
    },
    'obstacle-dog': {
        ready: false,
        src: 'obstacle-dog.png',
        height: 134,
        width: obstacleWidth,
        vector: [[65, 0], [95, 41], [100, 50], [100, 59], [75, 124], [71, 127], [31, 135], [27, 132], [1, 56], [2, 48], [9, 37]]
    },
    'obstacle-bomb': {
        ready: false,
        src: 'obstacle-bomb.png',
        height: 110,
        width: obstacleWidth,
        vector: [[100, 1], [100, 11], [89, 71], [84, 82], [74, 95], [56, 103], [40, 104], [28, 101], [17, 95], [10, 87], [3, 75], [1, 62], [2, 48], [6, 36], [14, 26], [26, 18], [85, 1]]
    }
}

for (let imageName of Object.keys(images)) {
    const imageMeta = images[imageName]
    imageMeta.image = new Image()
    imageMeta.image.onload = () => imageMeta.ready = true
    imageMeta.image.src = imageMeta.src
}

const INITIAL_PIXELS_PER_SECOND = 300
let pixelsPerSecond = INITIAL_PIXELS_PER_SECOND
const laneChangePixelsPerSecond = 800
let lastMainLoopTime = new Date().getTime()
let offsetPx = 0

const laneWidth = carWidth * 1.5
const laneCount = 3
const laneLineWidth = 10
const lanesX = (canvas.width / 2) - (laneWidth * laneCount / 2)
const lanesWidth = laneWidth * laneCount
let currentLane = 0

const defaultCarX = (canvas.width / 2) - (carWidth / 2)
const car = {
    x: defaultCarX,
    y: canvas.height - carHeight - 100
}

let obstacles = []

let gameOver = false
let paused = false
let debug = false

const obstacleGroups = [
    [
        {offsetPx: 0, lane: -1, type: 'bomb'},
        {offsetPx: -500, lane: 0, type: 'box'},
        {offsetPx: -1000, lane: 1, type: 'box'},
        {offsetPx: -1000, lane: -1, type: 'box'}
    ],
    [
        {offsetPx: 0, lane: -1, type: 'box'},
        {offsetPx: -500, lane: 0, type: 'dog'},
        {offsetPx: -500, lane: 1, type: 'bomb'},
        {offsetPx: -1000, lane: 1, type: 'box'},
        {offsetPx: -1050, lane: -1, type: 'dog'}
    ],
    [
        {offsetPx: 0, lane: -1, type: 'box'},
        {offsetPx: -100, lane: 0, type: 'box'},
        {offsetPx: -600, lane: 1, type: 'dog'},
        {offsetPx: -1100, lane: 0, type: 'bomb'},
        {offsetPx: -1100, lane: -1, type: 'bomb'}
    ],
    [
        {offsetPx: 0, lane: -1, type: 'bomb'},
        {offsetPx: 0, lane: 0, type: 'bomb'},
        {offsetPx: -500, lane: 0, type: 'box'},
        {offsetPx: -500, lane: 1, type: 'box'},
        {offsetPx: -1000, lane: -1, type: 'dog'},
        {offsetPx: -1500, lane: -1, type: 'box'},
        {offsetPx: -1500, lane: 1, type: 'dog'},
        {offsetPx: -2000, lane: 0, type: 'box'},
        {offsetPx: -2500, lane: 0, type: 'box'},
        {offsetPx: -2500, lane: 1, type: 'bomb'}
    ],
    [
        {offsetPx: 0, lane: -1, type: 'bomb'},
        {offsetPx: 0, lane: 0, type: 'bomb'},
        {offsetPx: -500, lane: 0, type: 'box'},
        {offsetPx: -500, lane: 1, type: 'box'},
        {offsetPx: -1000, lane: -1, type: 'dog'},
        {offsetPx: -1500, lane: 0, type: 'bomb'},
        {offsetPx: -2000, lane: -1, type: 'box'},
        {offsetPx: -2000, lane: 0, type: 'dog'}
    ]
]

function updateOffsetPx(elapsedMs) {
    if (paused) return
    offsetPx += (elapsedMs / 1000) * pixelsPerSecond
}

function addObstacles() {
    const farthestObstacleOffsetPx = obstacles.length
        ? obstacles[obstacles.length - 1].offsetPx
        : 0
    if (farthestObstacleOffsetPx + offsetPx < -2000) return

    const gapPx = 1000
    const addToOffsetPx = farthestObstacleOffsetPx - gapPx

    const obstacleGroupIdx = parseInt(Math.random() * obstacleGroups.length)
    const obstacleGroup = obstacleGroups[obstacleGroupIdx]
    for (let obstacle of obstacleGroup) {
        const clonedObstacle = Object.assign({}, obstacle, {offsetPx: obstacle.offsetPx + addToOffsetPx})
        obstacles.push(clonedObstacle)
    }
}

function removeObstacles() {
    let i
    for (i = 0; i < obstacles.length; i++) {
        if (obstacles[i].offsetPx + offsetPx <= canvas.height) break
    }
    if (i === 0) return
    obstacles = obstacles.slice(i)
}

function detectCollision() {
    const carTop = car.y
    const carBottom = car.y + carHeight
    const carLeft = car.x
    const carRight = car.x + carWidth

    const carSATPolygon = new SAT.Polygon(new SAT.Vector(car.x, car.y), images.car.vector.map(point => new SAT.Vector(point[0], point[1])))

    for (let obstacle of obstacles) {
        const image = images[`obstacle-${obstacle.type}`]

        const middleOfLaneX = (canvas.width / 2) + (obstacle.lane * laneWidth)

        const obstacleTop = obstacle.offsetPx + offsetPx
        const obstacleBottom = obstacleTop + image.height
        const obstacleLeft = middleOfLaneX - (image.width / 2)
        const obstacleRight = middleOfLaneX + (image.width / 2)

        if (obstacleTop > carBottom) continue
        if (obstacleBottom < carTop) continue
        if (obstacleRight < carLeft) continue
        if (obstacleLeft > carRight) continue

        const obstacleSATPolygon = new SAT.Polygon(new SAT.Vector(obstacleLeft, obstacleTop), image.vector.map(point => new SAT.Vector(point[0], point[1])))
        const response = new SAT.Response()
        const collided = SAT.testPolygonPolygon(carSATPolygon, obstacleSATPolygon, response)
        if (!collided) continue

        gameOver = true
        break
    }
}

function adjustSpeed(elapsedMs) {
    if (paused) return
    pixelsPerSecond += elapsedMs / 100
}

function changeLanes(elapsedMs) {
    const targetCarX = defaultCarX + (currentLane * laneWidth)
    const maxLaneChangeMovementPx = (elapsedMs / 1000) * laneChangePixelsPerSecond
    const desiredLaneChangeMovementPx = Math.abs(car.x - targetCarX)
    const actualLaneChangeMovementPx = Math.min(desiredLaneChangeMovementPx, maxLaneChangeMovementPx)
    if (targetCarX < car.x) car.x -= actualLaneChangeMovementPx
    else car.x += actualLaneChangeMovementPx
}

const leftArrowKeyCode = 37
const rightArrowKeyCode = 39
const spaceKeyCode = 32
const letterDKeyCode = 68

window.addEventListener('keydown', evt => {
    if (evt.keyCode === leftArrowKeyCode) {
        currentLane = Math.max(currentLane - 1, (laneCount - 1) / 2 * -1)
    } else if (evt.keyCode === rightArrowKeyCode) {
        currentLane = Math.min(currentLane + 1, (laneCount - 1) / 2)
    } else if (evt.keyCode === spaceKeyCode) {
        paused = !paused
    } else if (evt.keyCode === letterDKeyCode) {
        debug = !debug
    }
})

function update(elapsedMs) {
    updateOffsetPx(elapsedMs)
    adjustSpeed(elapsedMs)
    addObstacles()
    removeObstacles()
    changeLanes(elapsedMs)
    detectCollision()
}

function renderGameOver() {
    ctx.font = "30px Arial"
    ctx.fillText("GAME OVER", 10, 110)
}

function renderBackground() {
    ctx.fillStyle = "green"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
}

function renderRoad() {
    ctx.fillStyle = "black"
    ctx.fillRect(lanesX, 0, lanesWidth, canvas.height)

    // draw far left white line
    ctx.beginPath()
    ctx.strokeStyle = "white"
    ctx.setLineDash([])
    ctx.moveTo(lanesX, 0)
    ctx.lineTo(lanesX, canvas.height)
    ctx.lineWidth = laneLineWidth
    ctx.stroke()

    // draw far right white line
    ctx.beginPath()
    ctx.strokeStyle = "white"
    ctx.setLineDash([])
    ctx.moveTo(lanesX + lanesWidth, 0)
    ctx.lineTo(lanesX + lanesWidth, canvas.height)
    ctx.lineWidth = laneLineWidth
    ctx.stroke()

    const dashedLineOffset = offsetPx % 90

    // draw dashed lines to the right of all lanes except last
    for (let laneNum = 1; laneNum < laneCount; laneNum++) {
        ctx.beginPath()
        ctx.strokeStyle = "white"
        ctx.moveTo(lanesX + (laneWidth * laneNum), -90 + dashedLineOffset)
        ctx.lineTo(lanesX + (laneWidth * laneNum), canvas.height)
        ctx.setLineDash([50, 40])
        ctx.lineWidth = laneLineWidth
        ctx.stroke()
    }
}

function renderObstacles() {
    for (let obstacle of obstacles) {
        const image = images[`obstacle-${obstacle.type}`]

        const middleOfLaneX = (canvas.width / 2) + (obstacle.lane * laneWidth)
        const x = middleOfLaneX - (image.width / 2)
        const y = obstacle.offsetPx + offsetPx

        renderImage(image, x, y)
        if (debug) renderVector(image.vector, x, y)
    }
}

function renderCar() {
    renderImage(images.car, car.x, car.y)
    if (debug) renderVector(images.car.vector, car.x, car.y)
}

function renderImage(image, x, y) {
    if (!image.ready) return
    if (y + image.height < 0) return
    if (y > canvas.height) return
    ctx.drawImage(image.image, x, y, image.width, image.height)
}

function renderVector(vector, x, y) {
    ctx.setLineDash([])
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2
    ctx.beginPath()
    const firstPoint = vector[0]
    ctx.moveTo(firstPoint[0] + x, firstPoint[1] + y)
    for (let i = 1; i < vector.length; i++) {
        ctx.lineTo(vector[i][0] + x, vector[i][1] + y)
    }
    ctx.closePath()
    ctx.stroke()
}

function renderScore() {
    ctx.font = "30px Arial"
    ctx.fillText(`Distance: ${parseInt(offsetPx / 100)}`, 10, 30)
    ctx.fillText(`Speed: ${parseInt(pixelsPerSecond / 10)}`, 10, 70)
}

function render() {
    renderBackground()
    renderRoad()
    renderObstacles()
    renderCar()
    renderScore()
}

function main() {
    const now = new Date().getTime()
    const elapsedMs = now - lastMainLoopTime
    lastMainLoopTime = now
    if (gameOver) {
        render()
        renderGameOver()
    } else {
        update(elapsedMs)
        render()
        requestAnimationFrame(main)
    }
}

main()
