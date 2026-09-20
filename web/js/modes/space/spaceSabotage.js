// spaceSabotage.js - Impostor Sabotage HUD, Cooldown Timers, and Alarm Effects

export class SpaceSabotageController {
  updateSabotageHUD(ui, s, myP) {
    if (!ui) return;
    const isImpostor = myP && myP.role === 'impostor';
    const isSabActive = s.sabotage && s.sabotage.active;
    const sabotageBanner = document.getElementById('sabotage-active-banner');
    const sabotageText = document.getElementById('sabotage-active-text');

    if (sabotageBanner) {
      if (isSabActive) {
        sabotageBanner.classList.remove('hidden');
        if (sabotageText) {
          if (s.sabotage.type === 'lights') {
            sabotageText.textContent = `⚡ ELEKTRİK KESİNTİSİ! Görüş Alanı Kısıtlandı (${Math.ceil(s.sabotage.timer)}s)`;
          } else if (s.sabotage.type === 'reactor') {
            sabotageText.textContent = `⚠️ KRİTİK REAKTÖR ERİMESİ! (${Math.ceil(s.sabotage.timer)}s)`;
          } else if (s.sabotage.type === 'doors') {
            sabotageText.textContent = `🔒 TÜM KAPILAR KİLİTLENDİ! (${Math.ceil(s.sabotage.timer)}s)`;
          }
        }
      } else {
        sabotageBanner.classList.add('hidden');
      }
    }

    if (!isImpostor) return;

    const globalCd = Math.ceil(s.sabotageCooldown || 0);
    const cdLights = document.getElementById('cd-sabotage-lights');
    const cdReactor = document.getElementById('cd-sabotage-reactor');
    const cdDoors = document.getElementById('cd-sabotage-doors');
    const btnSabLights = document.getElementById('btn-sabotage-lights');
    const btnSabReactor = document.getElementById('btn-sabotage-reactor');
    const btnSabDoors = document.getElementById('btn-sabotage-doors');

    if (cdLights && btnSabLights) {
      if (s.sabotage && s.sabotage.type === 'lights' && isSabActive) {
        cdLights.textContent = `(Aktif: ${Math.ceil(s.sabotage.timer)}s)`;
        btnSabLights.disabled = true;
      } else if (globalCd > 0) {
        cdLights.textContent = `(${globalCd}s)`;
        btnSabLights.disabled = true;
      } else {
        cdLights.textContent = 'Hazır';
        btnSabLights.disabled = false;
      }
    }

    if (cdReactor && btnSabReactor) {
      if (s.sabotage && s.sabotage.type === 'reactor' && isSabActive) {
        cdReactor.textContent = `(Aktif: ${Math.ceil(s.sabotage.timer)}s)`;
        btnSabReactor.disabled = true;
      } else if (globalCd > 0) {
        cdReactor.textContent = `(${globalCd}s)`;
        btnSabReactor.disabled = true;
      } else {
        cdReactor.textContent = 'Hazır';
        btnSabReactor.disabled = false;
      }
    }

    if (cdDoors && btnSabDoors) {
      if (s.sabotage && s.sabotage.type === 'doors' && isSabActive) {
        cdDoors.textContent = `(Aktif: ${Math.ceil(s.sabotage.timer)}s)`;
        btnSabDoors.disabled = true;
      } else if (globalCd > 0) {
        cdDoors.textContent = `(${globalCd}s)`;
        btnSabDoors.disabled = true;
      } else {
        cdDoors.textContent = 'Hazır';
        btnSabDoors.disabled = false;
      }
    }
  }
}
