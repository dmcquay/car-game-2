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
        src: 'red-car-top-view-hi.png',
        height: 200,
        width: carWidth
    },
    'obstacle-box': {
        ready: false,
        src: 'obstacle-box.svg',
        height: obstacleWidth,
        width: obstacleWidth
    },
    'obstacle-dog': {
        ready: false,
        src: 'obstacle-dog.png',
        height: 134,
        width: obstacleWidth
    }
}

for (let imageName of Object.keys(images)) {
    const imageMeta = images[imageName]
    imageMeta.image = new Image()
    imageMeta.image.onload = () => imageMeta.ready = true
    imageMeta.image.src = imageMeta.src
}

const pixelsPerSecond = 300
const laneChangePixelsPerSecond = 900
const startTime = new Date().getTime()

const laneWidth = carWidth * 1.5
const laneCount = 3
const laneLineWidth = 10
const lanesX = (canvas.width / 2) - (laneWidth * laneCount / 2)
const lanesWidth = laneWidth * laneCount
let currentLane = 0

const defaultCarX = (canvas.width / 2) - (carWidth / 2)
const car = {
    x: defaultCarX,
    y: ((canvas.height / 4) * 3) - (carHeight / 2)
}

let obstacles = []

let gameOver = false

const obstacleGroups = [
    [
        {offsetPx: 0, lane: -1, type: 'box'},
        {offsetPx: -400, lane: 0, type: 'box'},
        {offsetPx: -800, lane: 1, type: 'box'},
        {offsetPx: -800, lane: -1, type: 'box'}
    ],
    [
        {offsetPx: 0, lane: -1, type: 'box'},
        {offsetPx: -400, lane: 0, type: 'dog'},
        {offsetPx: -500, lane: 1, type: 'box'},
        {offsetPx: -900, lane: 1, type: 'box'},
        {offsetPx: -850, lane: -1, type: 'dog'}
    ]
]

function addObstacles() {
    const elapsedTime = new Date().getTime() - startTime
    const offsetPixels = parseInt((elapsedTime / 1000) * pixelsPerSecond)

    const farthestObstacleOffsetPx = obstacles.length
        ? obstacles[obstacles.length - 1].offsetPx
        : 0
    if (farthestObstacleOffsetPx + offsetPixels < -2000) return

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
    const elapsedTime = new Date().getTime() - startTime
    const offsetPixels = parseInt((elapsedTime / 1000) * pixelsPerSecond)
    let i
    for (i = 0; i < obstacles.length; i++) {
        if (obstacles[i].offsetPx + offsetPixels <= canvas.height) break
    }
    if (i === 0) return
    obstacles = obstacles.slice(i)
}

function detectCollision() {
    const elapsedTime = new Date().getTime() - startTime
    const offsetPixels = parseInt((elapsedTime / 1000) * pixelsPerSecond)

    for (let obstacle of obstacles) {
        if (obstacle.lane !== currentLane) continue
        const image = images[`obstacle-${obstacle.type}`]
        const obstacleTop = obstacle.offsetPx + offsetPixels
        const obstacleBottom = obstacleTop + image.height
        const carTop = car.y
        const carBottom = car.y + carHeight

        if (obstacleBottom >= carTop && obstacleTop <= carBottom) {
            gameOver = true
            break
        }
    }
}

const leftArrowKeyCode = 37
const rightArrowKeyCode = 39

window.addEventListener('keydown', evt => {
    if (evt.keyCode === leftArrowKeyCode) {
        currentLane = Math.max(currentLane - 1, (laneCount - 1) / 2 * -1)
    } else if (evt.keyCode === rightArrowKeyCode) {
        currentLane = Math.min(currentLane + 1, (laneCount - 1) / 2)
    }
})

let lastUpdateTime = new Date().getTime()
function update() {
    const timeSinceLastUpdate = new Date().getTime() - lastUpdateTime

    addObstacles()
    removeObstacles()
    detectCollision()

    const targetCarX = defaultCarX + (currentLane * laneWidth)
    const maxLaneChangeMovementPx = (timeSinceLastUpdate / 1000) * laneChangePixelsPerSecond
    const desiredLaneChangeMovementPx = Math.abs(car.x - targetCarX)
    const actualLaneChangeMovementPx = Math.min(desiredLaneChangeMovementPx, maxLaneChangeMovementPx)
    if (targetCarX < car.x) car.x -= actualLaneChangeMovementPx
    else car.x += actualLaneChangeMovementPx

    lastUpdateTime = new Date().getTime()
}

function renderGameOver() {
    ctx.font = "30px Arial"
    ctx.fillText("GAME OVER", 10, 50)
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

    const elapsedTime = new Date().getTime() - startTime
    const offsetPixels = parseInt((elapsedTime / 1000) * pixelsPerSecond)
    const dashedLineOffset = offsetPixels % 90

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
        if (obstacle.offsetPx + offsetPixels + image.height < 0) continue
        if (obstacle.offsetPx + offsetPixels > canvas.height) continue
        const middleOfLaneX = (canvas.width / 2) + (obstacle.lane * laneWidth)
        const x = middleOfLaneX - (image.width / 2)
        ctx.drawImage(image.image, x, obstacle.offsetPx + offsetPixels, image.width, image.height)
    }

    // draw car
    if (images.car.ready) ctx.drawImage(images.car.image, car.x, car.y, carWidth, carHeight)
}

function main() {
    if (gameOver) {
        renderGameOver()
    } else {
        update()
        render()
        requestAnimationFrame(main)
    }
}

main()