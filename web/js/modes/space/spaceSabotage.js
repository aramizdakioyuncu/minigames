// spaceSabotage.js - Impostor Sabotage HUD, Cooldown Timers, and Alarm Effects

export class SpaceSabotageController {
  updateSabotageHUD(ui, s, myP) {
    if (!ui) return;
    const isImpostor = myP && myP.role === 'impostor';
    const isSabActive = s.sabotage && s.sabotage.active;
    const sabotageBanner = document.getElementById('space-sabotage-banner');
    const sabotageText = document.getElementById('space-sabotage-text');
    const repair=document.getElementById('btn-fix-sabotage-shortcut');
    if(repair){
      const reactor=s.sabotage?.type==='reactor';
      const near=myP && (reactor?(s.reactorPanels||[]).some(p=>Math.hypot(myP.x-p.x,myP.y-p.y)<85):s.generator&&Math.hypot(myP.x-s.generator.x,myP.y-s.generator.y)<=120);
      repair.disabled=!near||!myP?.isAlive||myP?.isSpectator||myP?.isVented||s.gameState!=='playing'||!isSabActive||!['lights','reactor'].includes(s.sabotage?.type);
      repair.textContent=reactor?(near?'Paneli Basılı Tut (E)':'Reaktör panellerine git'):near?'⚡ Jeneratörü Onar':'⚡ Jeneratöre git (sarı koridor)';
      if(!this.boundRepair) {
        this.boundRepair=true;
        const release=()=>{if(this.reactorHeld){window.gameApp.input.keys.hold=false;this.reactorHeld=false;}};
        repair.addEventListener('pointerdown',event=>{
          if(window.gameApp.lastGameState?.modeState.sabotage?.type!=='reactor'||repair.disabled)return;
          event.preventDefault();repair.setPointerCapture(event.pointerId);this.reactorHeld=true;window.gameApp.input.keys.hold=true;
        });
        for(const type of ['pointerup','pointercancel','lostpointercapture'])repair.addEventListener(type,release);
      }
      if(!reactor&&this.reactorHeld){window.gameApp.input.keys.hold=false;this.reactorHeld=false;}
    }

    if (sabotageBanner) {
      if (isSabActive) {
        sabotageBanner.classList.remove('hidden');
        if (sabotageText) {
          if (s.sabotage.type === 'lights') {
            sabotageText.textContent = '⚡ ELEKTRİK KESİNTİSİ! Jeneratör onarılana kadar görüş kısıtlı.';
          } else if (s.sabotage.type === 'reactor') {
            sabotageText.textContent = `⚠️ REAKTÖR: ${Math.ceil(s.sabotage.timer)}s • İki paneli birlikte tutun (${s.sabotage.repairCount||0}/2)`;
          } else if (s.sabotage.type === 'doors') {
            sabotageText.textContent = `🔒 TÜM KAPILAR KİLİTLENDİ! (${Math.ceil(s.sabotage.timer)}s)`;
          }
        }
      } else {
        sabotageBanner.classList.add('hidden');
      }
    }

    if (!isImpostor) return;

    const globalCd = Math.ceil(s.sabotage?.cooldown || 0);
    const cdLights = document.getElementById('cd-sabotage-lights');
    const cdReactor = document.getElementById('cd-sabotage-reactor');
    const cdDoors = document.getElementById('cd-sabotage-doors');
    const btnSabLights = document.getElementById('btn-sabotage-lights');
    const btnSabReactor = document.getElementById('btn-sabotage-reactor');
    const btnSabDoors = document.getElementById('btn-sabotage-doors');

    if (cdLights && btnSabLights) {
      if (s.sabotage && s.sabotage.type === 'lights' && isSabActive) {
        cdLights.textContent = 'Onarılmayı bekliyor';
        btnSabLights.disabled = true;
      } else if (globalCd > 0 || isSabActive) {
        cdLights.textContent = isSabActive?'Sabotaj aktif':`(${globalCd}s)`;
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
      } else if (globalCd > 0 || isSabActive) {
        cdReactor.textContent = isSabActive?'Sabotaj aktif':`(${globalCd}s)`;
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
      } else if (globalCd > 0 || isSabActive) {
        cdDoors.textContent = isSabActive?'Sabotaj aktif':`(${globalCd}s)`;
        btnSabDoors.disabled = true;
      } else {
        cdDoors.textContent = 'Hazır';
        btnSabDoors.disabled = false;
      }
    }
  }
}
