const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d')
canvas.width = window.innerWidth
canvas.height = window.innerHeight
document.body.appendChild(canvas)

let carImgReady = false
const carImg = new Image()
carImg.onload = () => carImgReady = true
carImg.src = 'red-car-top-view-hi.png'
const carHeight = 200
const carWidth = 100

const pixelsPerSecond = 500
const startTime = new Date().getTime()

const laneWidth = carWidth * 1.5
const laneCount = 3
const laneLineWidth = 10
const lanesX = (canvas.width / 2) - (laneWidth * laneCount / 2)
const lanesWidth = laneWidth * laneCount

const car = {
    x: (canvas.width / 2) - (carWidth / 2),
    y: ((canvas.height / 4) * 3) - (carHeight / 2)
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
    const offsetPixels = (elapsedTime / 1000) * pixelsPerSecond
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

    if (carImgReady) ctx.drawImage(carImg, car.x, car.y, carWidth, carHeight)
}

function main() {
    render()
    requestAnimationFrame(main)
}

main()