/* Arena appearance gallery. Selection uses the existing atomic profile store. */
(() => {
 const copy={en:{title:'Arena styles',unavailable:'Arena styles are unavailable. Please try again later.',help:'Choose the look of your fight-night arena.',selected:'Selected',choose:'Select',free:'Included'},he:{title:'סגנונות זירה',unavailable:'סגנונות הזירה אינם זמינים כרגע. נסו שוב בהמשך.',help:'בחרו את המראה של זירת הקרבות שלכם.',selected:'נבחר',choose:'בחירה',free:'כלול'},ru:{title:'Стиль арены',unavailable:'Оформление арен пока недоступно. Попробуйте позже.',help:'Выберите оформление арены для боёв.',selected:'Выбрано',choose:'Выбрать',free:'Доступно'}};
 const words=lang=>copy[lang]||copy.en;
 function render({modal,store,app,el,button,change}){
  const lang=app.lang||'en',w=words(lang);modal.classList.add('game-venue-gallery');modal.firstChild.querySelector('h2').textContent=w.title;const catalog=window.GameVenues?.catalog;if(!Array.isArray(catalog)||!catalog.length){modal.append(el('p','game-muted',w.unavailable));return;}modal.append(el('p','game-muted venue-help',w.help));const grid=el('div','venue-gallery-grid'),detail=el('p','game-muted venue-description');detail.setAttribute('role','status');modal.append(grid,detail);
  const cards=[];function sync(){const selected=store.game().venue||'default';for(const {card,label,id}of cards){const active=id===selected;card.setAttribute('aria-pressed',String(active));label.textContent=active?'✓ '+w.selected:w.free+' · '+w.choose;}detail.textContent=catalog.find(v=>v.id===selected)?.description[lang]||'';}
  for(const venue of catalog){const card=button('',()=>{if(change({type:'venue',venueId:venue.id}))sync();},'game-button venue-choice');card.dataset.venueId=venue.id;const img=el('img');img.src='./assets/venues/'+venue.id+'.png?v=2026110905';img.alt=venue.names[lang];img.width=320;img.height=190;const label=el('small');card.append(img,el('strong','',venue.names[lang]),label);grid.append(card);cards.push({card,label,id:venue.id});}sync();
 }
 window.GameVenuesUI={words,render};
})();
