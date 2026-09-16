# KIROSHI NIGHT — neon city FPS

Playable browser FPS: rainy neon street, wet asphalt, poster-faced enemies, katana / phone / machine gun.

## Run

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (default `http://localhost:5173`).

Production build:

```bash
npm run build
npm run preview
```

## Controls

| Input | Action |
| --- | --- |
| **W A S D** | Move |
| **Hold V + drag / move mouse** | Look (required) |
| Click canvas | Optional pointer-lock look |
| **Left mouse** | Fire / attack |
| **1** | Katana (melee) |
| **2** | Phone (quirky scan-flash cone) |
| **3** | Machine gun (magazine + reserve ammo) |
| **R** | Reload the gun |

Click **CLICK TO ENTER** on the overlay to start. After a game over, the same button restarts.

## Visual notes

Target look is a first-person rainy cyberpunk night block: reflective wet street, neon signage, steam, rain, and HUD weapon slots matching the dream screenshot. Billboard ads and enemy faces use `public/assets/enemy-poster-a.png` and `enemy-poster-b.png`.

Street PBR textures and night HDRI are CC0 from [Poly Haven](https://polyhaven.com) (`asphalt_02`, `concrete_wall_008`, `shanghai_bund`).
