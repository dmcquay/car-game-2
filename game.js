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
    carRed: {
        ready: false,
        src: 'red-car-top-view-hi.png',
        height: 200,
        width: carWidth,
        vector: [[52.1575564, 0.824458905], [69.538941, 2.77324667], [81.0936754, 8.75103112], [90.6686442, 19.6036012], [94.5540163, 31.0503825], [101.11287, 82.1769611], [93.7251244, 171.064588], [87.8121118, 195.452597], [77.1501024, 199.192467], [51.5426932, 200.795805], [27.2645149, 199.477839], [14.6649824, 195.668503], [7.67431649, 168.586361], [1.47029994, 88.1575617], [8.62899721, 26.9772659], [14.3035743, 15.1484245], [25.6161183, 6.15076999], [39.5570852, 1.85142125]]
    },
    car: {
        ready: false,
        src: 'car-green.png',
        height: 202,
        width: carWidth
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
        vector: [[65.5047458, 0.982169569], [95.5047327, 41.3997293], [100.879745, 50.7020375], [100.879745, 59.0069918], [75.0221695, 124.612048], [71.6148317, 127.3286], [31.9979159, 135.48631], [27.3148396, 132.6645], [1.10468188, 56.4698941], [2.9302879, 48.3599241], [9.78234979, 37.718033]]
    },
    'obstacle-bomb': {
        ready: false,
        src: 'obstacle-bomb.png',
        height: 110,
        width: obstacleWidth,
        vector: [[100.99907, 1], [100.99907, 11.5574898], [89.1815244, 71.8131541], [84.5282014, 82.8562424], [74.3510312, 95.0712154], [56.9458133, 103.513917], [40.3861158, 104.620003], [28.5356706, 101.027364], [17.5860172, 95.2284756], [10.0256833, 87.2286027], [3.91885478, 75.692678], [1, 62.8684039], [2.2034683, 48.7761783], [6.56135271, 36.9875844], [14.794813, 26.655786], [26.132024, 18.5466863], [85.2513352, 1]]
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
const laneChangePixelsPerSecond = 1200
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

window.addEventListener('keydown', evt => {
    if (evt.keyCode === leftArrowKeyCode) {
        currentLane = Math.max(currentLane - 1, (laneCount - 1) / 2 * -1)
    } else if (evt.keyCode === rightArrowKeyCode) {
        currentLane = Math.min(currentLane + 1, (laneCount - 1) / 2)
    } else if (evt.keyCode === spaceKeyCode) {
        paused = !paused
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

function render() {
    ctx.fillStyle = "green"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

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

    // draw obstacles
    for (let obstacle of obstacles) {
        const image = images[`obstacle-${obstacle.type}`]
        if (!image.ready) continue
        if (obstacle.offsetPx + offsetPx + image.height < 0) continue
        if (obstacle.offsetPx + offsetPx > canvas.height) continue
        const middleOfLaneX = (canvas.width / 2) + (obstacle.lane * laneWidth)
        const x = middleOfLaneX - (image.width / 2)
        ctx.drawImage(image.image, x, obstacle.offsetPx + offsetPx, image.width, image.height)
    }

    // draw car
    if (images.car.ready) ctx.drawImage(images.car.image, car.x, car.y, carWidth, carHeight)

    // draw score
    ctx.font = "30px Arial"
    ctx.fillText(`Distance: ${parseInt(offsetPx / 100)}`, 10, 30)
    ctx.fillText(`Speed: ${parseInt(pixelsPerSecond / 10)}`, 10, 70)
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
