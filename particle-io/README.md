# Particle.io MCP Server

Soothing particle animations for ChatGPT Apps SDK.

# Link for the mcp :-https://particel-io.vercel.app/

## Description

A ChatGPT App that creates beautiful, calming particle animations. Simply describe a scene or pick a preset, and watch mesmerizing particles come to life in an interactive widget.

## Features

- **11 Handcrafted Presets**: Starry Night, Ocean Waves, Fireflies, Cherry Blossoms, Gentle Snow, Northern Lights, Peaceful Rain, Floating Bubbles, Galaxy Spiral, Warm Fire, Zen Garden
- **Natural Language**: Describe any scene and get matching particles
- **Smooth Animations**: 60fps canvas-based particle rendering
- **Beautiful Backgrounds**: Gradient backgrounds that match each theme

## Tools

| Tool | Description |
|------|-------------|
| `create_particles` | Create particles from a text prompt (e.g., "starry night", "gentle snow") |
| `list_presets` | Show all available preset names |
| `quick_preset` | Instantly show a specific preset animation |

## Presets

- `starryNight` - Twinkling stars on a night sky
- `ocean` - Calm ocean waves
- `fireflies` - Glowing fireflies in the dark
- `sakura` - Falling cherry blossom petals
- `snow` - Gentle snowfall
- `aurora` - Northern lights with rainbow colors
- `rain` - Peaceful rain drops
- `bubbles` - Floating bubbles rising up
- `galaxy` - Spinning galaxy spiral
- `fire` - Warm flickering fire
- `zen` - Zen garden sand particles

## Usage

**In ChatGPT:**
- "Show me snow particles"
- "Create a starry night"
- "I want something calming like fireflies"

**Direct tool calls:**
- `create_particles({ prompt: "ocean waves" })`
- `quick_preset({ preset: "aurora" })`

## Deployment

Deployed on Vercel: `https://particel-io-vdbc.vercel.app/mcp`

## Setup

1. Add as MCP connector in ChatGPT Developer Mode
2. URL: `https://particel-io-vdbc.vercel.app/mcp`
3. No authentication required

## Tech Stack

- TypeScript
- Vercel Serverless Functions
- HTML5 Canvas for animations
- MCP Protocol with Apps SDK widget support

## License

MIT
