function createAudio(wxApi) {
  const sounds = {}, names = ['step', 'push', 'place', 'win'];
  names.forEach(name => {
    try {
      const audio = wxApi.createInnerAudioContext();
      audio.src = '/sokoban/assets/audio/' + name + '.wav';
      audio.volume = name === 'step' ? 0.18 : 0.35;
      audio.obeyMuteSwitch = true;
      audio.onError(() => {});
      sounds[name] = audio;
    } catch (e) { /* Audio is optional on unsupported clients. */ }
  });
  return {
    play(name) { const audio = sounds[name]; if (audio) { audio.stop(); audio.play(); } },
    stop() { names.forEach(name => { if (sounds[name]) sounds[name].stop(); }); },
    destroy() { names.forEach(name => { if (sounds[name]) sounds[name].destroy(); }); }
  };
}
module.exports = { createAudio };
