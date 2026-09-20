// spaceMinimap.js - Radar and Full-screen Minimap Renderer for Space/Castle/Mansion Themes

export class SpaceMinimapRenderer {
  renderMinimap(canvas, gameState, myPlayerId) {
    if (!canvas || !gameState) return;
    const ctx = canvas.getContext('2d');
    const s = gameState.modeState || {};
    const cw = canvas.width;
    const ch = canvas.height;

    const mapW = s.width || 2800;
    const mapH = s.height || 1800;
    const scaleX = (cw * 0.9) / mapW;
    const scaleY = (ch * 0.9) / mapH;

    const toScreenX = (wx) => cw / 2 + wx * scaleX;
    const toScreenY = (wy) => ch / 2 + wy * scaleY;

    const theme = s.mapTheme || 'spaceship';
    let gridColor = 'rgba(56, 189, 248, 0.08)';
    let roomBorderColor = '#0284c7';
    let roomTitleColor = '#38bdf8';
    let corrFillColor = 'rgba(30, 41, 59, 0.7)';
    let bgFill = '#030712';

    if (theme === 'castle') {
      gridColor = 'rgba(245, 158, 11, 0.1)';
      roomBorderColor = '#d97706';
      roomTitleColor = '#f59e0b';
      corrFillColor = 'rgba(41, 37, 36, 0.85)';
      bgFill = '#0c0a09';
    } else if (theme === 'mansion') {
      gridColor = 'rgba(225, 29, 72, 0.1)';
      roomBorderColor = '#e11d48';
      roomTitleColor = '#fb7185';
      corrFillColor = 'rgba(39, 25, 17, 0.85)';
      bgFill = '#090507';
    }

    // 1. Radar Grid Background
    ctx.fillStyle = bgFill;
    ctx.fillRect(0, 0, cw, ch);

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let x = 0; x < cw; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke();
    }
    for (let y = 0; y < ch; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
    }

    // 2. Corridors Paths
    const corridors = s.corridors || [];
    corridors.forEach(corr => {
      const rx = toScreenX(corr.x - corr.w / 2);
      const ry = toScreenY(corr.y - corr.h / 2);
      const rw = corr.w * scaleX;
      const rh = corr.h * scaleY;

      ctx.fillStyle = corrFillColor;
      ctx.fillRect(rx, ry, rw, rh);

      // Corridor Label
      ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(corr.name, toScreenX(corr.x), toScreenY(corr.y) + 3);
    });

    // 3. Rooms Layout
    const rooms = s.rooms || [];
    rooms.forEach(r => {
      const rx = toScreenX(r.x - r.w / 2);
      const ry = toScreenY(r.y - r.h / 2);
      const rw = r.w * scaleX;
      const rh = r.h * scaleY;

      ctx.fillStyle = theme === 'castle' ? 'rgba(28, 25, 23, 0.9)' : (theme === 'mansion' ? 'rgba(28, 17, 12, 0.9)' : 'rgba(15, 23, 42, 0.85)');
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = roomBorderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(rx, ry, rw, rh);

      // Room Title & Icon
      ctx.fillStyle = roomTitleColor;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${r.icon || '📍'} ${r.name}`, toScreenX(r.x), toScreenY(r.y) - 6);
    });

    // 4. Doors
    const doors = s.doors || [];
    doors.forEach(d => {
      const dx = toScreenX(d.x);
      const dy = toScreenY(d.y);
      ctx.fillStyle = d.isOpen ? '#22c55e' : '#ef4444';
      ctx.beginPath();
      ctx.arc(dx, dy, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. Tasks (Yellow Exclamation Marks)
    const stations = s.taskStations || [];
    const myPlayerMeta = (s.playersMeta || []).find(p => p.id === myPlayerId);
    const completedList = (myPlayerMeta && myPlayerMeta.completedTasksList) || [];

    stations.forEach(st => {
      const isDone = completedList.includes(st.id);
      const sx = toScreenX(st.x);
      const sy = toScreenY(st.y);

      ctx.fillStyle = isDone ? '#10b981' : '#facc15';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isDone ? '✓' : '!', sx, sy);
    });

    // 6. Current Player Beacon
    const myPlayer = (gameState.players || []).find(p => p.id === myPlayerId);
    if (myPlayer) {
      const px = toScreenX(myPlayer.x);
      const py = toScreenY(myPlayer.y);

      // Pulse ring
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 12, 0, Math.PI * 2);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('SEN', px, py - 16);
    }
  }
}
