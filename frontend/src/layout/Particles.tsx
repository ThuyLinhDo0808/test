"use client"

import { useEffect, useRef } from "react"

export default function MagicalParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas to full screen
    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    handleResize()
    window.addEventListener("resize", handleResize)

    // Particle class
    class Particle {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      color: string
      alpha: number

      constructor() {
        this.x = Math.random() * canvas!.width
        this.y = Math.random() * canvas!.height
        this.size = Math.random() * 7 + 1
        this.speedX = Math.random() * 0.3
        this.speedY = Math.random() * 0.3
        this.color = this.getRandomColor()
        this.alpha = Math.random() * 5 + 0.1
      }

      getRandomColor() {
        const colors = [
          "#8a2be2", // Purple
          "#4b0082", // Indigo
          "#9400d3", // Violet
          "#9932cc", // Dark Orchid
          "#ba55d3", // Medium Orchid
          "#800080", // Purple
          "#4169e1", // Royal Blue
        ]
        return colors[Math.floor(Math.random() * colors.length)]
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY

        // Bounce off edges
        if (this.x > canvas!.width || this.x < 0) {
          this.speedX = -this.speedX
        }
        if (this.y > canvas!.height || this.y < 0) {
          this.speedY = -this.speedY
        }
      }

      draw() {
        if (!ctx) return
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.save()
        ctx.globalAlpha = this.alpha
        ctx.fillStyle = this.color
        ctx.fill()
        ctx.restore()
      }
    }

    // Create particles
    const particlesArray: Particle[] = []

    const isMobile = window.innerWidth < 768;
    const baseDivisor = isMobile ? 30000 : 20000;
    const particleCap = isMobile ? 20 : 40;

    const numberOfParticles = Math.min(particleCap, Math.floor((window.innerWidth * window.innerHeight) / baseDivisor));


    for (let i = 0; i < numberOfParticles; i++) {
      particlesArray.push(new Particle())
    }
    let lastConnectionTime = 0;
    const connectionInterval = 10;
    // Animation loop
    const animate = (time?: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
      }

      if (!time || time - lastConnectionTime > connectionInterval) {
        connectParticles();
        lastConnectionTime = time ?? 0;
      }

      requestAnimationFrame(animate);
    };

    // Connect particles with lines
    const connectParticles = () => {
      if (!ctx) return

      for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
          const dx = particlesArray[a].x - particlesArray[b].x
          const dy = particlesArray[a].y - particlesArray[b].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 200) {
            const opacity = 1 - distance / 200
            ctx.strokeStyle = `rgba(147, 51, 234, ${opacity * 0.7})`
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y)
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y)
            ctx.stroke()
          }
        }
      }
    }

    animate()

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full -z-10 opacity-40" />
}