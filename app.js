const $ = id => document.getElementById(id);
const tabs = [...document.querySelectorAll('[role="tab"]')];
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let running = false, inspecting = false, faulty = false, frame = 0, settle = null;
let pos = {x:0,y:0};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function log(message){ pulse(document.querySelector('.console'),'log-update'); $('log').textContent = new Date().toLocaleTimeString('zh-CN',{hour12:false}) + '  ' + message; }
function show(name){ document.querySelector('.workspace').dataset.active = name; tabs.forEach(tab => {const active = tab.dataset.scene === name; tab.setAttribute('aria-selected',String(active)); tab.tabIndex = active ? 0 : -1; $(tab.dataset.scene).hidden = !active;}); }
tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>show(tab.dataset.scene));tab.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%3;if(e.key==='ArrowLeft')next=(i+2)%3;if(e.key==='Home')next=0;if(e.key==='End')next=2;if(next===undefined)return;e.preventDefault();tabs[next].focus();show(tabs[next].dataset.scene);});});
function stop(report=true){cancelAnimationFrame(frame);frame=0;$('speed').textContent='0.0';$('motion').classList.remove('moving');$('axis-state').textContent='● READY';if(settle){const resolve=settle;settle=null;resolve(false);}if(report)log('运动已停止，当前位置已保留。');}
function moveTo(x,y){stop(false);const start={...pos},started=performance.now(),duration=reduced?1:2200;$('motion').classList.remove('arrived');$('motion').classList.add('moving');$('axis-state').textContent='● MOVING';log(`开始模拟定位 → X ${x.toFixed(2)} / Y ${y.toFixed(2)} mm`);return new Promise(resolve=>{settle=resolve;function tick(now){const t=Math.min((now-started)/duration,1),ease=t*t*(3-2*t);pos={x:start.x+(x-start.x)*ease,y:start.y+(y-start.y)*ease};const px=45+pos.x/200*335,py=190-pos.y/100*135;$('cursor').setAttribute('transform',`translate(${px} ${py})`);$('trail').setAttribute('d',`M${45+start.x/200*335} ${190-start.y/100*135} L${px} ${py}`);$('x-pos').textContent=pos.x.toFixed(2);$('y-pos').textContent=pos.y.toFixed(2);$('speed').textContent=(t<1?Math.hypot(x-start.x,y-start.y)/(duration/1000)*6*t*(1-t):0).toFixed(1);if(t<1)frame=requestAnimationFrame(tick);else{frame=0;settle=null;$('motion').classList.remove('moving');pulse($('motion'),'arrived');$('axis-state').textContent='● IN POSITION';log('模拟运动完成，已到达目标位置。');resolve(true);}}frame=requestAnimationFrame(tick);});}
async function inspect(){if(inspecting)return false;inspecting=true;$('inspect').disabled=true;$('sample').disabled=true;$('camera').classList.remove('passed','rejected');$('camera').classList.add('scanning');$('result').textContent='检测中…';$('result').classList.remove('ng');log('触发模拟采图，正在检测工件…');await delay(reduced?100:1100);$('camera').classList.remove('scanning');pulse($('camera'),faulty?'rejected':'passed');pulse(document.querySelector('.result'),'result-pop');$('result').textContent=faulty?'NG / 外观异常':'OK / 定位完成';$('result').classList.toggle('ng',faulty);$('detection-label').textContent=faulty?'DEFECT / 模拟缺陷':'MATCH / 99.2% · SIM';log(faulty?'模拟检测 NG：发现示意缺陷，运动流程不执行。':'模拟检测 OK：X 128.40 / Y 76.20 mm，允许定位。');$('inspect').disabled=false;$('sample').disabled=false;inspecting=false;return !faulty;}
$('inspect').addEventListener('click',inspect);
$('sample').addEventListener('click',()=>{faulty=!faulty;$('camera').classList.remove('passed','rejected');pulse(document.querySelector('.workpiece'),'sample-swap');$('camera').classList.toggle('faulty',faulty);$('result').textContent='等待检测';$('result').classList.remove('ng');$('detection-label').textContent='TARGET / 待检测';log(`已切换到${faulty?'带缺陷':'正常'}模拟工件。`);});
$('move').addEventListener('click',()=>{if(!running)moveTo(200,100);});$('home').addEventListener('click',()=>{if(!running)moveTo(0,0);});$('stop').addEventListener('click',()=>stop());
$('run').addEventListener('click',async()=>{if(running||inspecting)return;running=true;$('run').disabled=true;$('move').disabled=true;$('home').disabled=true;stop(false);$('overview').classList.add('running');$('cell-status').textContent='运行 RUNNING';$('flow-status').textContent='采集准备';log('模拟设备已连接，工件到位。');await delay(1200);show('vision');const passed=await inspect();let completed=false;if(passed){await delay(900);show('motion');completed=await moveTo(128.4,76.2);}$('flow-status').textContent=completed?'流程完成':passed?'已停止':'检测异常';$('cell-status').textContent=completed?'完成 DONE':'待机 READY';$('overview').classList.remove('running');$('run').disabled=false;$('move').disabled=false;$('home').disabled=false;running=false;if(completed)log('演示结束：设备就绪 → 视觉检测 OK → 运动到位。');});
$('print').addEventListener('click',()=>window.print());

// Short, restartable effects; no persistent animation loop outside active demos.
function pulse(element, name) {
  element.classList.remove(name);
  void element.offsetWidth;
  element.classList.add(name);
}
const workspace = document.querySelector('.workspace');
workspace.dataset.active = 'overview';
const steps = document.createElement('div');
steps.className = 'flow-steps';
steps.setAttribute('aria-hidden', 'true');
steps.innerHTML = '<span data-step="overview"><i>01</i>设备就绪</span><b>→</b><span data-step="vision"><i>02</i>视觉检测</span><b>→</b><span data-step="motion"><i>03</i>运动定位</span>';
workspace.querySelector('nav').after(steps);
if (!reduced && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.details,.project-card,.career-item,.education,.contact').forEach(el => {
    el.classList.add('reveal');
    observer.observe(el);
  });
}

// All resume sections share a single viewport; resize fits the active section.
const main = document.querySelector('main');
const introSection = main.querySelector('.intro');
const workspaceSection = main.querySelector('.workspace');
const skillsSection = main.querySelector('.details');
const projectsSection = main.querySelector('.project-section');
const careerSection = main.querySelector('.career');
const educationSection = main.querySelector('.education');
const contactSection = main.querySelector('.contact');
const screenNav = document.createElement('div');
screenNav.className = 'screen-nav';
screenNav.setAttribute('role','navigation');
screenNav.setAttribute('aria-label','简历页面');
document.querySelector('header').after(screenNav);
const screens = [
  {id:'intro', label:'个人介绍', nodes:[introSection]},
  {id:'demo', label:'交互演示', nodes:[workspaceSection]},
  {id:'skills', label:'技术能力', nodes:[skillsSection]},
  {id:'projects', label:'项目经历', nodes:[projectsSection]},
  {id:'career', label:'工作履历', nodes:[careerSection]},
  {id:'contact', label:'教育 / 联系', nodes:[educationSection,contactSection]}
];
let activeScreen = null;
function fitScreen(){
  if(!activeScreen)return;
  const content=activeScreen.firstElementChild;
  content.style.transform='none';
  const scale=Math.min(1,(activeScreen.clientHeight-16)/content.scrollHeight);
  content.style.transform=`scale(${Math.max(.1,scale)})`;
}
function selectScreen(id,focus=false){
  screens.forEach(screen=>{
    const active=screen.id===id;
    screen.element.hidden=!active;
    if(active){activeScreen=screen.element;screen.button.setAttribute('aria-current','page');}
    else screen.button.removeAttribute('aria-current');
  });
  requestAnimationFrame(fitScreen);
  if(focus)activeScreen.focus({preventScroll:true});
}
screens.forEach(screen=>{
  const element=document.createElement('section');
  element.className='screen';element.hidden=true;element.tabIndex=-1;
  element.setAttribute('aria-label',screen.label);
  const content=document.createElement('div');content.className='screen-content';
  screen.nodes.forEach(node=>content.append(node));element.append(content);main.append(element);
  const button=document.createElement('button');button.textContent=screen.label;
  button.addEventListener('click',()=>selectScreen(screen.id));screenNav.append(button);
  screen.element=element;screen.button=button;
});
const picker=document.createElement('div');picker.className='project-picker';
picker.setAttribute('role','group');picker.setAttribute('aria-label','选择项目');
const projectCards=[...projectsSection.querySelectorAll('.project-card')];
projectCards.forEach((card,index)=>{
  const button=document.createElement('button');button.textContent=`0${index+1} ${card.querySelector('h3').textContent}`;
  button.setAttribute('aria-pressed',String(index===0));card.hidden=index!==0;
  button.addEventListener('click',()=>{
    projectCards.forEach((item,i)=>{item.hidden=i!==index;picker.children[i].setAttribute('aria-pressed',String(i===index));});
    pulse(card,'result-pop');requestAnimationFrame(fitScreen);
  });picker.append(button);
});
projectsSection.querySelector('.section-heading').after(picker);
document.querySelectorAll('details').forEach(detail=>detail.addEventListener('toggle',()=>requestAnimationFrame(fitScreen)));
document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',event=>{
  event.preventDefault();selectScreen(link.getAttribute('href')==='#resume'?'skills':'intro');
}));
document.querySelector('footer').classList.add('screen-footer');
const oldShow=show;
show=function(name){oldShow(name);requestAnimationFrame(fitScreen);};
const screenResize=new ResizeObserver(()=>requestAnimationFrame(fitScreen));
screens.forEach(screen=>screenResize.observe(screen.element.firstElementChild));
window.addEventListener('resize',fitScreen);
selectScreen(location.hash==='#projects'?'projects':location.hash==='#resume'?'skills':'intro');

// Automatic presentation with reading time and explicit playback control.
screenNav.hidden = true;
const playback = document.createElement('div');
playback.className = 'playback';
playback.setAttribute('role','group');
playback.setAttribute('aria-label','简历轮播控制');
playback.innerHTML = '<button class="slide-prev" aria-label="上一屏">‹</button><span class="slide-caption"></span><button class="slide-toggle" aria-label="暂停自动轮播">暂停</button><button class="slide-next" aria-label="下一屏">›</button><span class="slide-progress" aria-hidden="true"><i></i></span>';
document.querySelector('footer').before(playback);
let playing = !reduced;
let slideTimer = null;
let carouselIndex = screens.findIndex(screen => screen.element === activeScreen);
const caption = playback.querySelector('.slide-caption');
const toggle = playback.querySelector('.slide-toggle');
function refreshPlayback(){
  const screen = screens[carouselIndex];
  caption.textContent = `0${carouselIndex+1} / 0${screens.length} · ${screen.label}`;
  toggle.textContent = playing ? '暂停' : '播放';
  toggle.setAttribute('aria-label',playing?'暂停自动轮播':'开始自动轮播');
  clearTimeout(slideTimer);
  playback.classList.remove('playing');
  const duration = screen.id === 'projects' ? 22000 : screen.id === 'career' ? 18000 : 12000;
  playback.style.setProperty('--slide-duration',duration+'ms');
  void playback.offsetWidth;
  if(playing && !document.hidden){
    playback.classList.add('playing');
    slideTimer=setTimeout(()=>advanceSlide(1,true),duration);
  }
}
function advanceSlide(direction,automatic=false){
  // Give a running equipment demonstration enough time to finish.
  if(running || inspecting){slideTimer=setTimeout(()=>advanceSlide(direction,automatic),1000);return;}
  if(automatic && screens[carouselIndex].id==='projects'){
    const current=projectCards.findIndex(card=>!card.hidden);
    if(current<projectCards.length-1){
      projectCards.forEach((card,index)=>{card.hidden=index!==current+1;picker.children[index].setAttribute('aria-pressed',String(index===current+1));});
      requestAnimationFrame(fitScreen);refreshPlayback();return;
    }
  }
  carouselIndex=(carouselIndex+direction+screens.length)%screens.length;
  if(screens[carouselIndex].id==='projects'){
    projectCards.forEach((card,index)=>{card.hidden=index!==0;picker.children[index].setAttribute('aria-pressed',String(index===0));});
  }
  selectScreen(screens[carouselIndex].id);
}
const selectBeforeCarousel = selectScreen;
selectScreen = function(id,focus=false){
  selectBeforeCarousel(id,focus);
  carouselIndex=screens.findIndex(screen=>screen.id===id);
  refreshPlayback();
};
playback.querySelector('.slide-prev').addEventListener('click',()=>advanceSlide(-1));
playback.querySelector('.slide-next').addEventListener('click',()=>advanceSlide(1));
toggle.addEventListener('click',()=>{playing=!playing;refreshPlayback();});
// Interacting with content pauses the presentation so reading is never interrupted.
main.addEventListener('click',()=>{playing=false;refreshPlayback();});
main.addEventListener('keydown',()=>{playing=false;refreshPlayback();});
document.addEventListener('visibilitychange',refreshPlayback);
refreshPlayback();
requestAnimationFrame(fitScreen);
// Horizontal touch gestures: vertical movement and multi-touch remain untouched.
let swipeStart = null;
main.addEventListener('touchstart', event => {
  if(event.touches.length !== 1){swipeStart=null;return;}
  const touch=event.touches[0];
  swipeStart={x:touch.clientX,y:touch.clientY,time:performance.now()};
},{passive:true});
main.addEventListener('touchcancel',()=>{swipeStart=null;},{passive:true});
main.addEventListener('touchend',event=>{
  if(!swipeStart || event.changedTouches.length!==1)return;
  const start=swipeStart;swipeStart=null;
  const touch=event.changedTouches[0];
  const dx=touch.clientX-start.x,dy=touch.clientY-start.y;
  if(Math.abs(dx)<50 || Math.abs(dx)<Math.abs(dy)*1.5 || performance.now()-start.time>1200)return;
  playing=false;
  if(running || inspecting){refreshPlayback();return;}
  const direction=dx<0?1:-1;
  if(screens[carouselIndex].id==='projects'){
    const current=projectCards.findIndex(card=>!card.hidden),next=current+direction;
    if(next>=0 && next<projectCards.length){
      projectCards.forEach((card,index)=>{card.hidden=index!==next;picker.children[index].setAttribute('aria-pressed',String(index===next));});
      requestAnimationFrame(fitScreen);refreshPlayback();return;
    }
  }
  advanceSlide(direction);
},{passive:true});
